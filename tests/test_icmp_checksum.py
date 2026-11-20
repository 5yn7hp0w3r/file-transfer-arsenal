#!/usr/bin/env python3
"""Unit tests for the ICMP packet builder (no raw sockets/root required)."""
import struct
import sys
import unittest
from pathlib import Path

# The ICMP scripts are standalone files, not an installed package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "icmp"))
import icmp_send  # noqa: E402


def rfc1071_checksum(data: bytes) -> int:
    """Independent big-endian RFC 1071 implementation used as a test oracle."""
    if len(data) % 2:
        data += b"\x00"
    total = 0
    for i in range(0, len(data), 2):
        total += (data[i] << 8) + data[i + 1]
        total = (total & 0xFFFF) + (total >> 16)
    return ~total & 0xFFFF


class TestIcmpChecksum(unittest.TestCase):
    def test_checksum_matches_rfc1071(self):
        samples = [
            b"",
            b"\x00",
            b"abc",
            b"hello world",
            bytes(range(256)),
            b"\xff" * 33,
        ]
        for sample in samples:
            with self.subTest(length=len(sample)):
                self.assertEqual(icmp_send.checksum(sample), rfc1071_checksum(sample))

    def test_built_packet_has_valid_checksum(self):
        for data in (b"", b"a", b"abc", b"x" * 1400):
            with self.subTest(length=len(data)):
                packet = icmp_send.build_icmp_packet(0x11223344, 7, data)
                field = struct.unpack("!H", packet[2:4])[0]
                zeroed = packet[:2] + b"\x00\x00" + packet[4:]

                self.assertEqual(field, rfc1071_checksum(zeroed))
                # A packet that includes its own checksum must sum to zero.
                self.assertEqual(rfc1071_checksum(packet), 0)

    def test_header_and_payload_layout(self):
        session_id = 0x11223344
        packet_idx = 0x55667788
        packet = icmp_send.build_icmp_packet(session_id, packet_idx, b"data")

        icmp_type, code, _checksum, icmp_id, _icmp_seq = struct.unpack(
            "!BBHHH", packet[:8]
        )
        self.assertEqual((icmp_type, code), (8, 0))
        self.assertEqual(icmp_id, session_id & 0xFFFF)
        self.assertEqual(
            struct.unpack("!II", packet[8:16]),
            (session_id, packet_idx),
        )
        self.assertEqual(packet[16:], b"data")


if __name__ == "__main__":
    unittest.main()
