#!/usr/bin/env python3
"""Small HTTP upload receiver for authorized file-transfer labs.

Accepts:
  * multipart/form-data with any field name;
  * raw POST/PUT bodies (for curl --data-binary, certreq, etc.).

By default it listens on 0.0.0.0:8000 and saves into the current directory.
"""
import argparse
import datetime
import hashlib
import hmac
import os
import re
import socket
import ssl
import sys
import urllib.parse
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_PORT = 8000
DEFAULT_MAX_SIZE = 1024 * 1024 * 1024  # 1 GiB
SOCKET_TIMEOUT = 60.0


def parse_size(value: str) -> int:
    """Parse 1024, 512K, 10M, 2G, or 0/unlimited."""
    value = value.strip().lower()
    if value in ("0", "none", "unlimited"):
        return 0
    match = re.fullmatch(r"(\d+)\s*([kmgt]?)i?b?", value)
    if not match:
        raise argparse.ArgumentTypeError(
            "size must be a number with an optional K/M/G/T suffix, or 0"
        )
    number = int(match.group(1))
    unit = match.group(2)
    multiplier = {
        "": 1,
        "k": 1024,
        "m": 1024 ** 2,
        "g": 1024 ** 3,
        "t": 1024 ** 4,
    }[unit]
    return number * multiplier


def human_size(value: int) -> str:
    if value == 0:
        return "unlimited"
    size = float(value)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if size < 1024 or unit == "TiB":
            return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} B"
        size /= 1024
    return f"{size:.1f} TiB"


def safe_name(name: str, fallback: str) -> str:
    """Keep only a basename; never allow a path traversal."""
    name = (name or "").replace("\\", "/").split("/")[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip().strip('"')
    if not name or name in (".", ".."):
        return fallback
    return name[:255]


def filename_from_disposition(value: str):
    if not value:
        return None
    match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', value, re.IGNORECASE)
    return match.group(1).strip() if match else None


class UploadHandler(BaseHTTPRequestHandler):
    server_version = "FileTransferArsenal/1.1"

    # Silence the default per-request stderr logging; _log() prints clean lines.
    def log_message(self, *args):
        pass

    def _log(self, message: str):
        if not getattr(self.server, "quiet", False):
            stamp = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{stamp}] {message}", flush=True)

    def _read_body(self, length: int) -> bytes:
        self.connection.settimeout(SOCKET_TIMEOUT)
        data = self.rfile.read(length)
        if len(data) != length:
            raise ValueError(f"incomplete body: expected {length}, got {len(data)}")
        return data

    def _check_access(self) -> bool:
        expected = getattr(self.server, "token", "")
        if not expected:
            return True
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        supplied = (
            self.headers.get("X-Upload-Token")
            or query.get("token", [""])[0]
        )
        if supplied and hmac.compare_digest(
            str(supplied).encode("utf-8"), expected.encode("utf-8")
        ):
            return True
        self._error(401, "unauthorized")
        return False

    def _content_length(self) -> int:
        raw = self.headers.get("Content-Length")
        if raw is None:
            raw = self.headers.get("Content-length")
        if raw is None:
            self._error(411, "Content-Length is required")
            return -1
        try:
            length = int(raw)
        except ValueError:
            self._error(400, "invalid Content-Length")
            return -1
        if length < 0:
            self._error(400, "invalid Content-Length")
            return -1
        max_size = getattr(self.server, "max_size", 0)
        if max_size and length > max_size:
            self._error(
                413,
                f"request body is larger than the limit ({human_size(max_size)})",
            )
            return -1
        return length

    def _save(self, name: str, data: bytes):
        fallback = "received_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S") + ".bin"
        name = safe_name(name, fallback)
        path = Path(self.server.upload_dir) / name
        with path.open("wb") as handle:
            handle.write(data)
        digest = hashlib.sha256(data).hexdigest()
        self._log(
            f"client={self.client_address[0]} saved={path} "
            f"bytes={len(data)} sha256={digest}"
        )
        return {
            "name": name,
            "path": str(path),
            "size": len(data),
            "sha256": digest,
        }

    def _handle_multipart(self, body: bytes, ctype: str):
        head = b"Content-Type: " + ctype.encode("latin-1") + b"\r\nMIME-Version: 1.0\r\n\r\n"
        message = BytesParser(policy=email_policy).parsebytes(head + body)
        saved = []
        for part in message.iter_parts():
            filename = part.get_filename()
            if not filename:
                continue
            data = part.get_payload(decode=True)
            if data is None:
                data = b""
            saved.append(self._save(filename, data))
        return saved

    def _handle_raw(self, body: bytes):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        url_name = os.path.basename(urllib.parse.urlparse(self.path).path)
        name = (
            filename_from_disposition(self.headers.get("Content-Disposition", ""))
            or query.get("file", [None])[0]
            or (url_name if url_name not in ("", "/", "upload") else None)
        )
        return [self._save(name or "", body)]

    def _respond(self, saved):
        lines = [
            f"OK: {item['name']} ({item['size']} bytes) sha256={item['sha256']}"
            for item in saved
        ]
        payload = ("\n".join(lines) + "\n").encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _error(self, code: int, message: str):
        payload = (message + "\n").encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(payload)
        self.close_connection = True

    def _handle_upload(self):
        if not self._check_access():
            return

        length = self._content_length()
        if length < 0:
            return

        try:
            body = self._read_body(length)
        except (socket.timeout, TimeoutError) as exc:
            self._error(408, f"request timeout: {exc}")
            return
        except (OSError, ValueError) as exc:
            self._error(400, str(exc))
            return

        ctype = self.headers.get("Content-Type", "")
        try:
            if ctype.lower().startswith("multipart/form-data"):
                saved = self._handle_multipart(body, ctype)
                if not saved:
                    self._error(400, "no file parts in multipart body")
                    return
            else:
                saved = self._handle_raw(body)
        except (OSError, ValueError) as exc:
            self._error(400, f"could not parse upload: {exc}")
            return
        except Exception:
            self._error(500, "internal error while saving the upload")
            return

        self._respond(saved)

    def do_POST(self):
        self._handle_upload()

    def do_PUT(self):
        self._handle_upload()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path in ("/", "/health", "/healthz"):
            self._respond_text("ready\n")
        else:
            self._error(404, "not found")

    def _respond_text(self, text: str):
        payload = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def build_server(
    bind: str = "0.0.0.0",
    port: int = DEFAULT_PORT,
    directory: str = ".",
    max_size: int = DEFAULT_MAX_SIZE,
    token: str = "",
    quiet: bool = False,
    tls_cert: str = "",
    tls_key: str = "",
) -> ThreadingHTTPServer:
    upload_dir = Path(directory).expanduser().resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((bind, port), UploadHandler)
    server.upload_dir = str(upload_dir)
    server.max_size = max_size
    server.token = token
    server.quiet = quiet

    if tls_cert or tls_key:
        if not (tls_cert and tls_key):
            raise ValueError("--tls-cert and --tls-key must be used together")
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=tls_cert, keyfile=tls_key)
        server.socket = context.wrap_socket(server.socket, server_side=True)

    return server


def parse_args():
    parser = argparse.ArgumentParser(
        description="HTTP upload receiver: multipart or raw POST/PUT."
    )
    parser.add_argument("-p", "--port", type=int, default=DEFAULT_PORT,
                        help=f"TCP port (default: {DEFAULT_PORT})")
    parser.add_argument("-b", "--bind", default="0.0.0.0",
                        help="bind address (default: 0.0.0.0)")
    parser.add_argument("-d", "--directory", default=".",
                        help="directory for received files (default: current)")
    parser.add_argument("--max-size", type=parse_size, default=DEFAULT_MAX_SIZE,
                        help="max request body, e.g. 512M or 2G; 0 = unlimited "
                             f"(default: {human_size(DEFAULT_MAX_SIZE)})")
    parser.add_argument("--token", default="",
                        help="optional token required in X-Upload-Token or ?token=")
    parser.add_argument("--tls-cert", default="",
                        help="TLS certificate (PEM); requires --tls-key")
    parser.add_argument("--tls-key", default="",
                        help="TLS private key (PEM); requires --tls-cert")
    parser.add_argument("-q", "--quiet", action="store_true",
                        help="do not print received-file lines")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 0 <= args.port <= 65535:
        print("[!] Port must be between 0 and 65535", file=sys.stderr)
        return 2
    try:
        server = build_server(
            bind=args.bind,
            port=args.port,
            directory=args.directory,
            max_size=args.max_size,
            token=args.token,
            quiet=args.quiet,
            tls_cert=args.tls_cert,
            tls_key=args.tls_key,
        )
    except (OSError, ValueError) as exc:
        print(f"[!] Cannot start server: {exc}", file=sys.stderr)
        return 1

    host, port = server.server_address[:2]
    scheme = "https" if args.tls_cert else "http"
    print(f"[*] Listening on {scheme}://{host}:{port}")
    print(f"[*] Upload directory: {server.upload_dir}")
    print(f"[*] Max request body: {human_size(args.max_size)}")
    if args.token:
        print("[*] Token auth: enabled (X-Upload-Token or ?token=)")
    if args.tls_cert:
        print("[*] TLS: enabled")
    print("[*] POST/PUT multipart or raw body; GET /health for readiness.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
