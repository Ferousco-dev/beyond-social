"""Shared request/response plumbing for the BaseHTTPRequestHandler-based
Vercel functions in api/.
"""

import json


def read_json_body(handler) -> dict:
    length = int(handler.headers.get("Content-Length", 0) or 0)
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    handler._raw_body = raw  # stashed for signature verification by the caller
    if not raw:
        return {}
    return json.loads(raw)


def send_json(handler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)
