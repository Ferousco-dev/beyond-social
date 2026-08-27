"""POST /api/telegram/webhook

Receives every Telegram update for the bot. Always responds 200 once the
request has been authenticated, so Telegram never retries a delivery we've
already handled (retries are the one duplicate-task risk in a system with no
request-level storage).
"""

import logging
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.getcwd())

from lib import commands  # noqa: E402
from lib.config import MissingConfig, load_config  # noqa: E402
from lib.http_utils import read_json_body, send_json  # noqa: E402
from lib.security import is_authorized_user, verify_telegram_secret  # noqa: E402
from lib.telegram_client import send_message  # noqa: E402
from lib import messages  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telegram_agent.webhook")


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            config = load_config()
        except MissingConfig as exc:
            logger.error("missing configuration: %s", exc)
            send_json(self, 500, {"ok": False, "error": "server misconfigured"})
            return

        secret_header = self.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if not verify_telegram_secret(secret_header, config.telegram_webhook_secret):
            logger.warning("rejected webhook request with invalid secret token")
            send_json(self, 401, {"ok": False, "error": "unauthorized"})
            return

        update = read_json_body(self)
        message = update.get("message") or {}
        chat = message.get("chat") or {}
        sender = message.get("from") or {}
        text = (message.get("text") or "").strip()
        chat_id = chat.get("id")
        user_id = sender.get("id")

        if chat_id is None or user_id is None or not text:
            # Non-text update (a sticker, a channel post, an edited message,
            # etc). Nothing for an engineering agent to act on.
            send_json(self, 200, {"ok": True})
            return

        if not is_authorized_user(user_id, config.telegram_allowed_user_ids):
            logger.warning("rejected message from unauthorized telegram user")
            send_message(config.telegram_bot_token, chat_id, messages.UNAUTHORIZED)
            send_json(self, 200, {"ok": True})
            return

        replied_text = ((message.get("reply_to_message") or {}).get("text"))

        try:
            self._route(config, chat_id, text, replied_text)
        except Exception:
            logger.exception("unhandled error while routing telegram message")
            send_message(config.telegram_bot_token, chat_id, "⚠️ Something went wrong handling that\\.")

        send_json(self, 200, {"ok": True})

    def _route(self, config, chat_id: int, text: str, replied_text: str | None) -> None:
        lowered = text.lower()
        if lowered.startswith("/start"):
            commands.handle_start(config, chat_id)
        elif lowered.startswith("/help"):
            commands.handle_help(config, chat_id)
        elif lowered.startswith("/status"):
            commands.handle_status(config, chat_id)
        elif lowered.startswith("/cancel"):
            commands.handle_cancel(config, chat_id)
        else:
            commands.handle_task_message(config, chat_id, text, replied_text)

    def log_message(self, format, *args):  # noqa: A002
        pass
