"""Thin Telegram Bot API client. No secrets are ever logged; on failure only
the HTTP status and Telegram's non-sensitive `description` field are logged.
"""

import logging

import requests

logger = logging.getLogger("telegram_agent.telegram")

_API_BASE = "https://api.telegram.org/bot{token}/{method}"
_TIMEOUT_SECONDS = 8


def send_message(bot_token: str, chat_id: int, text: str) -> bool:
    url = _API_BASE.format(token=bot_token, method="sendMessage")
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "MarkdownV2",
        "disable_web_page_preview": True,
    }
    try:
        response = requests.post(url, json=payload, timeout=_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning("telegram sendMessage request failed: %s", type(exc).__name__)
        return False

    if response.ok:
        return True

    # A malformed MarkdownV2 message (special characters we missed escaping
    # in caller-supplied text) is the single most common failure here; retry
    # once as plain text rather than lose the notification entirely.
    logger.warning("telegram sendMessage failed with status %s, retrying as plain text", response.status_code)
    fallback_payload = {"chat_id": chat_id, "text": text, "disable_web_page_preview": True}
    try:
        retry = requests.post(url, json=fallback_payload, timeout=_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning("telegram sendMessage retry failed: %s", type(exc).__name__)
        return False
    return retry.ok
