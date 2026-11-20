#!/usr/bin/env python3
"""
ICMP File Receiver - server for icmp_send.py
Listens for ICMP Echo Request packets and reassembles a file.
"""
import os
import sys
import struct
import hashlib
import argparse
import time
import threading
from pathlib import Path

from scapy.all import sniff, ICMP, Raw

import logging
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)

received_chunks = {}
active_session = None
target_file_size = None
target_hash = None
current_bytes_received = 0
last_packet_time = 0.0
lock = threading.Lock()
OUTPUT_PATH = "received_file.bin"


def fmt_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def reset_session(session_id: int):
    global active_session, target_file_size, target_hash, current_bytes_received
    active_session = session_id
    received_chunks.clear()
    target_file_size = None
    target_hash = None
    current_bytes_received = 0
    print(f"\n[*] New session ID: {session_id}")


def save_and_exit(reason: str = "complete"):
    if not received_chunks and target_file_size is None:
        print("[!] No data received, nothing to save.")
        sys.stdout.flush()
        os._exit(1)

    sorted_indices = sorted(received_chunks.keys())
    expected = list(range(1, sorted_indices[-1] + 1)) if sorted_indices else []
    missing = [i for i in expected if i not in received_chunks]
    data = b"".join(received_chunks[i] for i in sorted_indices)
    ok = not missing

    out_path = Path(OUTPUT_PATH)
    with out_path.open("wb") as f:
        f.write(data)

    print(f"\n[*] Saved: {out_path}  ({fmt_bytes(len(data))})")
    print(f"[*] Reason: {reason}")
    print(f"[*] Packets: {len(sorted_indices)} received, {len(missing)} missing")
    if missing:
        preview = missing[:10]
        suffix = "..." if len(missing) > 10 else ""
        print(f"[!] Missing indices: {preview}{suffix}")

    if target_hash is not None:
        actual = hashlib.sha256(data).digest()
        if actual == target_hash:
            print("[+] SHA-256 matches - file is intact.")
        else:
            print("[!] SHA-256 MISMATCH!")
            print(f"    expected: {target_hash.hex()}")
            print(f"    got:      {actual.hex()}")
            ok = False
    else:
        print("[i] No hash provided in metadata; skipping integrity check.")

    size_ok = True
    if target_file_size is not None and len(data) != target_file_size:
        print(f"[!] Size mismatch: declared {target_file_size}, got {len(data)}")
        size_ok = False
        ok = False

    if not size_ok:
        print(f"[!] Transfer incomplete: received {len(data)} of {target_file_size} bytes.")

    sys.stdout.flush()
    os._exit(0 if ok else 2)


def process_packet(packet):
    global active_session, received_chunks, target_file_size, target_hash
    global current_bytes_received, last_packet_time

    if not (packet.haslayer(ICMP) and packet[ICMP].type == 8):
        return

    if packet.haslayer(Raw):
        raw_payload = bytes(packet[Raw].load)
    else:
        raw_payload = bytes(packet[ICMP].payload)
        if len(raw_payload) >= 8:
            raw_payload = raw_payload[8:]

    if len(raw_payload) < 8:
        return

    session_id, packet_idx = struct.unpack("!II", raw_payload[:8])
    data = raw_payload[8:]

    with lock:
        if active_session != session_id:
            if received_chunks:
                print(f"\n[*] Session changed ({active_session} → {session_id}). Saving previous...")
                save_and_exit(reason="session change")
            reset_session(session_id)

        # --- Packet #0: metadata ---
        if packet_idx == 0:
            if len(data) >= 8:
                size = struct.unpack("!Q", data[:8])[0]
                if target_file_size is None:
                    target_file_size = size
                    if len(data) >= 40:
                        target_hash = data[8:40]
                    print(f"[*] Declared size: {fmt_bytes(size)} ({size} bytes)")
                    if target_hash:
                        print(f"[*] SHA-256:       {target_hash.hex()}")
                last_packet_time = time.time()

                # Empty files have no data packets; a late metadata packet can
                # also arrive after every data packet.
                if target_file_size is not None and current_bytes_received >= target_file_size:
                    print("\n[End] All bytes received. Reassembling...")
                    save_and_exit(reason="complete")
            return

        # --- Data packet ---
        if packet_idx > 0 and packet_idx not in received_chunks:
            received_chunks[packet_idx] = data
            current_bytes_received += len(data)
            last_packet_time = time.time()

            if target_file_size:
                pct = (current_bytes_received / target_file_size) * 100
                print(f"[+] {current_bytes_received}/{target_file_size} B ({pct:5.1f}%)  pkts={len(received_chunks)}", end="\r")
            else:
                print(f"[+] Packets: {len(received_chunks)}", end="\r")

            if target_file_size and current_bytes_received >= target_file_size:
                print("\n\n[End] All bytes received. Reassembling...")
                save_and_exit(reason="complete")


def watchdog(timeout: float):
    """If no packets arrive for `timeout` seconds, save what we have."""
    global last_packet_time, received_chunks
    while True:
        time.sleep(1.0)
        with lock:
            if last_packet_time == 0:
                continue
            if time.time() - last_packet_time <= timeout:
                continue
            if not received_chunks and target_file_size is None:
                continue
            print(f"\n[!] No packets for {timeout:.0f}s. Saving partial file...")
            save_and_exit(reason="timeout")


def parse_args():
    p = argparse.ArgumentParser(description="ICMP file receiver")
    p.add_argument("-o", "--output", default="received_file.bin",
                   help="Output file (default: received_file.bin)")
    p.add_argument("-t", "--timeout", type=float, default=30.0,
                   help="Seconds of silence before saving partial (default: 30)")
    p.add_argument("--iface", default=None,
                   help="Interface to sniff on (default: all)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    OUTPUT_PATH = args.output

    print("[*] Server started. Waiting for ICMP Echo Requests...")
    print(f"[*] Output file: {args.output}")
    print(f"[*] Stall timeout: {args.timeout:.0f}s")
    if args.iface:
        print(f"[*] Interface: {args.iface}")

    threading.Thread(target=watchdog, args=(args.timeout,), daemon=True).start()

    try:
        sniff(filter="icmp", prn=process_packet, store=0, iface=args.iface)
    except KeyboardInterrupt:
        print("\n[!] Interrupted.")
        if received_chunks:
            save_and_exit(reason="user interrupt")
        sys.exit(130)
