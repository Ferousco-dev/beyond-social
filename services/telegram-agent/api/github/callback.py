"""POST /api/github/callback

Called by the telegram-claude-task GitHub Actions workflow when a task
starts, and again when it finishes. The chat to notify is never looked up
from storage: the workflow received it in `client_payload.telegram_chat_id`
when the task was dispatched and echoes it straight back here.
"""

import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.getcwd())

from lib import messages  # noqa: E402
from lib.config import MissingConfig, load_config  # noqa: E402
from lib.http_utils import read_json_body, send_json  # noqa: E402
from lib.security import verify_callback_signature  # noqa: E402
from lib.telegram_client import send_message  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telegram_agent.callback")

_VALID_STATUSES = {"in_progress", "success", "failure"}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            config = load_config()
        except MissingConfig as exc:
            logger.error("missing configuration: %s", exc)
            send_json(self, 500, {"ok": False, "error": "server misconfigured"})
            return

        length = int(self.headers.get("Content-Length", 0) or 0)
        raw_body = self.rfile.read(length) if length else b""

        signature = self.headers.get("X-Callback-Signature")
        if not verify_callback_signature(raw_body, signature, config.github_webhook_secret):
            logger.warning("rejected callback with invalid signature")
            send_json(self, 401, {"ok": False, "error": "unauthorized"})
            return

        try:
            payload = json.loads(raw_body) if raw_body else {}
        except ValueError:
            send_json(self, 400, {"ok": False, "error": "invalid json"})
            return

        task_id = payload.get("task_id")
        status = payload.get("status")
        chat_id = payload.get("telegram_chat_id")

        if not task_id or status not in _VALID_STATUSES or not isinstance(chat_id, int):
            send_json(self, 400, {"ok": False, "error": "missing or invalid required fields"})
            return

        text = self._render(task_id, status, payload)
        send_message(config.telegram_bot_token, chat_id, text)
        send_json(self, 200, {"ok": True})

    @staticmethod
    def _render(task_id: str, status: str, payload: dict) -> str:
        if status == "in_progress":
            return messages.IN_PROGRESS
        if status == "success":
            return messages.completed(task_id, payload)
        return messages.failed(task_id, payload)

    def log_message(self, format, *args):  # noqa: A002
        pass
