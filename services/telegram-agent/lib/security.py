"""Authentication and integrity checks.

Nothing in this module ever logs a secret value or an incoming token, only
the fact that a check passed or failed.
"""

import hashlib
import hmac


def is_authorized_user(user_id: int, allowed_ids: frozenset) -> bool:
    return user_id in allowed_ids


def verify_telegram_secret(header_value: str | None, expected_secret: str) -> bool:
    """Validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header.

    This is the header Telegram echoes back on every webhook delivery once a
    secret_token is registered via setWebhook; it is the mechanism that
    proves a request actually came from Telegram's servers and not from
    someone who merely guessed the webhook URL.
    """
    if not header_value:
        return False
    return hmac.compare_digest(header_value, expected_secret)


def verify_callback_signature(raw_body: bytes, signature_header: str | None, secret: str) -> bool:
    """Validates the HMAC-SHA256 signature GitHub Actions attaches to a
    completion callback, in the form `sha256=<hex digest>`.

    This is a signature we define ourselves (the callback is a plain HTTP
    POST from a workflow step, not a native GitHub webhook), so both sides
    must be configured with the same GITHUB_WEBHOOK_SECRET value.
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    provided = signature_header[len("sha256="):]
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(provided, expected)
