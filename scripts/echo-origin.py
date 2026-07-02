from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Echo(BaseHTTPRequestHandler):
    def _handle(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode() if length else ""
        payload = {
            "message": "hello from origin :9000",
            "method": self.command,
            "path": self.path,
            "headers": dict(self.headers),
            "body": body,
        }
        data = json.dumps(payload, indent=2).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-Origin", "test-origin-9000")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    do_GET = do_POST = do_PUT = do_DELETE = _handle

    def log_message(self, *args):
        pass


HTTPServer(("127.0.0.1", 9000), Echo).serve_forever()
