"""Local preview server for prototype/ that tells the browser never to reuse stale files.
Usage: python3 tools/serve.py [port]   (default 4190)"""
import http.server, functools, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'prototype'
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4190
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=str(ROOT))).serve_forever()
