"""Single Flask entrypoint for Vercel.

Vercel's Python runtime expects one `app` (ASGI/WSGI) object at the
project root when a repo defines more than one handler-style file under
api/ — see README.md, "Why one entrypoint" for the deploy error that
made this the shape instead of three separate api/*.py files.

Route handling here is deliberately thin: parse the request, hand off to
lib/, format the response. All the actual logic lives in lib/.
"""

import json
import logging

from flask import Flask, Response, request

from lib import commands, messages
from lib.config import MissingConfig, load_config
from lib.security import (
    is_authorized_user,
    verify_callback_signature,
    verify_telegram_secret,
)
from lib.telegram_client import send_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telegram_agent.app")

app = Flask(__name__)


def _json_response(payload: dict, status: int) -> Response:
    return Response(json.dumps(payload), status=status, mimetype="application/json")


@app.get("/api/health")
def health() -> Response:
    return _json_response({"status": "ok", "service": "telegram-dev-agent"}, 200)


@app.post("/api/telegram/webhook")
def telegram_webhook() -> Response:
    try:
        config = load_config()
    except MissingConfig as exc:
        logger.error("missing configuration: %s", exc)
        return _json_response({"ok": False, "error": "server misconfigured"}, 500)

    secret_header = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if not verify_telegram_secret(secret_header, config.telegram_webhook_secret):
        logger.warning("rejected webhook request with invalid secret token")
        return _json_response({"ok": False, "error": "unauthorized"}, 401)

    update = request.get_json(silent=True) or {}
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    sender = message.get("from") or {}
    text = (message.get("text") or "").strip()
    chat_id = chat.get("id")
    user_id = sender.get("id")

    if chat_id is None or user_id is None or not text:
        return _json_response({"ok": True}, 200)

    if not is_authorized_user(user_id, config.telegram_allowed_user_ids):
        logger.warning("rejected message from unauthorized telegram user")
        send_message(config.telegram_bot_token, chat_id, messages.UNAUTHORIZED)
        return _json_response({"ok": True}, 200)

    replied_text = (message.get("reply_to_message") or {}).get("text")

    try:
        _route_command(config, chat_id, text, replied_text)
    except Exception:
        logger.exception("unhandled error while routing telegram message")
        send_message(config.telegram_bot_token, chat_id, "⚠️ Something went wrong handling that\\.")

    return _json_response({"ok": True}, 200)


def _route_command(config, chat_id: int, text: str, replied_text: str | None) -> None:
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


@app.post("/api/github/callback")
def github_callback() -> Response:
    try:
        config = load_config()
    except MissingConfig as exc:
        logger.error("missing configuration: %s", exc)
        return _json_response({"ok": False, "error": "server misconfigured"}, 500)

    raw_body = request.get_data()
    signature = request.headers.get("X-Callback-Signature")
    if not verify_callback_signature(raw_body, signature, config.github_webhook_secret):
        logger.warning("rejected callback with invalid signature")
        return _json_response({"ok": False, "error": "unauthorized"}, 401)

    try:
        payload = json.loads(raw_body) if raw_body else {}
    except ValueError:
        return _json_response({"ok": False, "error": "invalid json"}, 400)

    task_id = payload.get("task_id")
    status = payload.get("status")
    chat_id = payload.get("telegram_chat_id")
    valid_statuses = {"in_progress", "success", "failure"}

    if not task_id or status not in valid_statuses or not isinstance(chat_id, int):
        return _json_response({"ok": False, "error": "missing or invalid required fields"}, 400)

    text = _render_callback(task_id, status, payload)
    send_message(config.telegram_bot_token, chat_id, text)
    return _json_response({"ok": True}, 200)


def _render_callback(task_id: str, status: str, payload: dict) -> str:
    if status == "in_progress":
        return messages.IN_PROGRESS
    if status == "success":
        return messages.completed(task_id, payload)
    return messages.failed(task_id, payload)
