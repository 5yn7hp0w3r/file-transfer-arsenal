#!/usr/bin/env python3
"""
ICMP File Sender - client for icmp_recv.py
Sends a file over ICMP Echo Request packets.
"""
import sys
import socket
import struct
import random
import time
import hashlib
import argparse
from pathlib import Path

DEFAULT_TARGET_IP = "10.0.2.10"
DEFAULT_CHUNK_SIZE = 1400       # safe under MTU 1500
DEFAULT_DELAY = 0.005           # seconds between packets
DEFAULT_RETRIES = 0             # reserved for future ACK support
SEQ_MAX = 0xFFFF                # 16-bit Sequence Number field in ICMP header


def checksum(source: bytes) -> int:
    """RFC 1071 Internet Checksum."""
    if len(source) % 2:
        source += b"\x00"
    s = 0
    for i in range(0, len(source), 2):
        s += (source[i] << 8) + source[i + 1]
        s = (s & 0xFFFF) + (s >> 16)
    return ~s & 0xFFFF


def build_icmp_packet(session_id: int, packet_idx: int, data: bytes) -> bytes:
    """
    ICMP Echo Request:
      header (8 B): type, code, csum, id, seq
      payload:      session_id (4 BE) + packet_idx (4 BE) + data
    """
    icmp_type = 8
    icmp_code = 0
    icmp_id = session_id & 0xFFFF
    icmp_seq = packet_idx & SEQ_MAX   # cosmetic; server reads full idx from payload

    custom_payload = struct.pack("!II", session_id, packet_idx) + data

    header = struct.pack("!BBHHH", icmp_type, icmp_code, 0, icmp_id, icmp_seq)
    csum = checksum(header + custom_payload)
    header = struct.pack("!BBHHH", icmp_type, icmp_code, csum, icmp_id, icmp_seq)
    return header + custom_payload


def send_file(target_ip, file_path, chunk_size, delay, retries) -> int:
    file_path = Path(file_path)
    if not file_path.is_file():
        print(f"[!] File not found: {file_path}", file=sys.stderr)
        return 1

    file_size = file_path.stat().st_size
    session_id = random.randint(1, 0xFFFFFFFF)

    print(f"[*] Sending:  {file_path}")
    print(f"[*] Size:     {file_size} bytes")
    print(f"[*] Target:   {target_ip}")
    print(f"[*] Session:  {session_id}")
    print(f"[*] Chunk:    {chunk_size} bytes")

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
    except PermissionError:
        print("[!] Root privileges required (use sudo).", file=sys.stderr)
        return 1
    except OSError as e:
        print(f"[!] Socket error: {e}", file=sys.stderr)
        return 1

    try:
        # --- Packet #0: metadata (file_size + sha256) ---
        sha256 = hashlib.sha256(file_path.read_bytes()).digest()
        meta = struct.pack("!Q", file_size) + sha256
        sock.sendto(build_icmp_packet(session_id, 0, meta), (target_ip, 0))
        time.sleep(0.01)

        # --- Data packets ---
        total = (file_size + chunk_size - 1) // chunk_size
        sent = 0
        t_start = time.time()

        with file_path.open("rb") as f:
            idx = 1
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                sock.sendto(build_icmp_packet(session_id, idx, chunk), (target_ip, 0))
                sent += len(chunk)
                pct = (sent / file_size * 100) if file_size else 100
                print(f"[+] Packet #{idx}/{total}  {sent}/{file_size} B  ({pct:5.1f}%)", end="\r")
                idx += 1
                if delay > 0:
                    time.sleep(delay)

        elapsed = time.time() - t_start
        speed = (file_size / 1024 / elapsed) if elapsed else 0
        print(f"\n[*] Done: {file_size} bytes in {elapsed:.2f}s  (~{speed:.1f} KB/s)")
        return 0

    except KeyboardInterrupt:
        print("\n[!] Interrupted by user.")
        return 130
    finally:
        sock.close()


def parse_args():
    p = argparse.ArgumentParser(description="ICMP file sender")
    p.add_argument("target", nargs="?", default=DEFAULT_TARGET_IP,
                   help=f"Target IP (default: {DEFAULT_TARGET_IP})")
    p.add_argument("file", help="File to send")
    p.add_argument("-c", "--chunk", type=int, default=DEFAULT_CHUNK_SIZE,
                   help=f"Chunk size (default: {DEFAULT_CHUNK_SIZE})")
    p.add_argument("-d", "--delay", type=float, default=DEFAULT_DELAY,
                   help=f"Delay between packets, sec (default: {DEFAULT_DELAY})")
    p.add_argument("-r", "--retries", type=int, default=DEFAULT_RETRIES,
                   help="Retries per packet (not implemented yet)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(send_file(args.target, args.file, args.chunk, args.delay, args.retries))
