"""Writes finished-task outcomes to the bot_memory Supabase table
(supabase/migrations/0076_bot_memory.sql) over its PostgREST endpoint, the
same append-only, service-role-only, no-new-dependency pattern
`docs/telegram-agent/kv-migration-scope.md` recommends for this project.

Optional and best-effort by design: an owner who hasn't set SUPABASE_URL /
SUPABASE_SERVICE_ROLE_KEY yet, or a Supabase outage, must never stop the
Telegram notification in app.py's github_callback from going out - see
record_task_outcome's callers.

This only writes. docs/telegram-agent/JOURNAL.md remains what a fresh Claude
session reads for cross-task context; switching that read path over to this
table means changing the prompt baked into
.github/workflows/telegram-claude-task.yml, which is separate follow-up
work (see the 2026-08-28 JOURNAL entry on why that file couldn't be edited
by a Telegram-triggered task).
"""

import logging

import requests

from lib import messages
from lib.config import Config

logger = logging.getLogger("telegram_agent.memory")

_TIMEOUT_SECONDS = 5


def record_task_outcome(config: Config, task_id: str, status: str, payload: dict) -> bool:
    """Inserts one bot_memory row for a task that just finished. Returns
    False (never raises) when memory isn't configured or the write fails,
    so callers can log it but don't need to handle it.
    """
    if not config.is_memory_configured:
        return False

    url = f"{config.supabase_url.rstrip('/')}/rest/v1/bot_memory"
    headers = {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = {"task_id": task_id, "summary": messages.memory_summary(status, payload)}
    try:
        response = requests.post(url, headers=headers, json=body, timeout=_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning("bot_memory insert failed: %s", type(exc).__name__)
        return False

    if response.status_code == 201:
        return True
    logger.warning("bot_memory insert rejected with status %s", response.status_code)
    return False
