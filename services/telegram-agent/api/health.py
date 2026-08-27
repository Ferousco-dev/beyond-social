import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.getcwd())

from lib.http_utils import send_json  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        send_json(self, 200, {"status": "ok", "service": "telegram-dev-agent"})

    def log_message(self, format, *args):  # noqa: A002 - silence default stderr access log
        pass
