"""Environment configuration for the Telegram engineering agent.

Every value is read lazily (at request time, not import time) so a missing
variable produces a clean error inside a request handler instead of crashing
the whole function at cold start.
"""

import os
from dataclasses import dataclass


class MissingConfig(Exception):
    """Raised when a required environment variable is not set."""


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise MissingConfig(name)
    return value


def _optional(name: str) -> str | None:
    value = os.environ.get(name, "").strip()
    return value or None


@dataclass(frozen=True)
class Config:
    telegram_bot_token: str
    telegram_webhook_secret: str
    telegram_allowed_user_ids: frozenset
    github_token: str
    github_owner: str
    github_repository: str
    github_workflow_file: str
    github_webhook_secret: str
    # Optional: writing to bot_memory degrades to a no-op without these, so
    # the bot works the same as before an owner sets them. See lib/memory.py.
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    @property
    def github_repo_full_name(self) -> str:
        return f"{self.github_owner}/{self.github_repository}"

    @property
    def is_memory_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


def load_config() -> Config:
    """Reads and validates all required environment variables.

    Raises MissingConfig(name) naming the first missing variable. Callers
    must catch this and return a generic error to the client; the variable
    name itself is safe to log server-side but never to send to Telegram.
    """
    allowed_raw = _require("TELEGRAM_ALLOWED_USER_IDS")
    try:
        allowed_ids = frozenset(int(x.strip()) for x in allowed_raw.split(",") if x.strip())
    except ValueError as exc:
        raise MissingConfig("TELEGRAM_ALLOWED_USER_IDS (must be a comma-separated list of integers)") from exc
    if not allowed_ids:
        raise MissingConfig("TELEGRAM_ALLOWED_USER_IDS (empty)")

    return Config(
        telegram_bot_token=_require("TELEGRAM_BOT_TOKEN"),
        telegram_webhook_secret=_require("TELEGRAM_WEBHOOK_SECRET"),
        telegram_allowed_user_ids=allowed_ids,
        github_token=_require("GITHUB_TOKEN"),
        github_owner=_require("GITHUB_OWNER"),
        github_repository=_require("GITHUB_REPOSITORY"),
        github_workflow_file=os.environ.get("GITHUB_WORKFLOW_FILE", "telegram-claude-task.yml").strip(),
        github_webhook_secret=_require("GITHUB_WEBHOOK_SECRET"),
        supabase_url=_optional("SUPABASE_URL"),
        supabase_service_role_key=_optional("SUPABASE_SERVICE_ROLE_KEY"),
    )
