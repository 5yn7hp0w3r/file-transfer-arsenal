#!/usr/bin/env python3
"""HTTP receiver tests using an ephemeral port and a temporary directory."""
import hashlib
import http.client
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "upload"))
import serv  # noqa: E402


class TestUploadServer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.server = serv.build_server(
            bind="127.0.0.1",
            port=0,
            directory=self.tmp.name,
            max_size=1024,
            token="s3cret",
            quiet=True,
        )
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self._stop_server)

    def _stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method, path, body=b"", headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        data = response.read()
        connection.close()
        return response.status, data

    def upload_path(self, name):
        return Path(self.tmp.name) / name

    def test_health(self):
        status, body = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"ready\n")

    def test_raw_post_with_token_and_filename(self):
        body = b"raw upload"
        status, response = self.request(
            "POST",
            "/upload?file=raw.bin",
            body,
            {
                "X-Upload-Token": "s3cret",
                "Content-Type": "application/octet-stream",
            },
        )
        self.assertEqual(status, 200)
        self.assertIn(hashlib.sha256(body).hexdigest().encode(), response)
        self.assertEqual(self.upload_path("raw.bin").read_bytes(), body)

    def test_missing_token_is_rejected(self):
        status, _ = self.request("POST", "/upload?file=x.bin", b"x")
        self.assertEqual(status, 401)
        self.assertFalse(self.upload_path("x.bin").exists())

    def test_put_uses_url_path_as_name(self):
        body = b"put upload"
        status, _ = self.request(
            "PUT",
            "/drop/put.bin?token=s3cret",
            body,
            {"Content-Type": "application/octet-stream"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.upload_path("put.bin").read_bytes(), body)

    def test_multipart_any_field_name(self):
        boundary = "test-boundary"
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="anything"; filename="multi.bin"\r\n'
            "Content-Type: application/octet-stream\r\n\r\n"
        ).encode() + b"multipart" + f"\r\n--{boundary}--\r\n".encode()
        status, _ = self.request(
            "POST",
            "/upload",
            body,
            {
                "X-Upload-Token": "s3cret",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.upload_path("multi.bin").read_bytes(), b"multipart")

    def test_max_size_is_enforced(self):
        status, _ = self.request(
            "POST",
            "/upload?file=big.bin",
            b"x" * 1025,
            {"X-Upload-Token": "s3cret"},
        )
        self.assertEqual(status, 413)
        self.assertFalse(self.upload_path("big.bin").exists())

    def test_path_traversal_is_stripped(self):
        status, _ = self.request(
            "POST",
            "/upload?file=../../escape.bin",
            b"safe",
            {"X-Upload-Token": "s3cret"},
        )
        self.assertEqual(status, 200)
        self.assertTrue(self.upload_path("escape.bin").exists())
        self.assertFalse((Path(self.tmp.name).parent / "escape.bin").exists())


if __name__ == "__main__":
    unittest.main()
