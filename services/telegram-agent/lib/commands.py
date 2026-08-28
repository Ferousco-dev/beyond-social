"""Telegram command and message handlers.

Each function takes the parsed update plus config and does one thing: reply
to the user and, where relevant, talk to GitHub. Kept out of api/telegram/
webhook.py so that file stays a thin request/response shim.
"""

import logging

from lib import github_client, messages, tasks
from lib.config import Config
from lib.telegram_client import send_message

logger = logging.getLogger("telegram_agent.commands")


def handle_start(config: Config, chat_id: int) -> None:
    send_message(config.telegram_bot_token, chat_id, messages.WELCOME)


def handle_help(config: Config, chat_id: int) -> None:
    send_message(config.telegram_bot_token, chat_id, messages.HELP)


def handle_status(config: Config, chat_id: int) -> None:
    runs = github_client.recent_workflow_runs(
        config.github_token, config.github_owner, config.github_repository, config.github_workflow_file
    )
    if not runs:
        send_message(config.telegram_bot_token, chat_id, "No recent Telegram\\-triggered runs found\\.")
        return
    lines = ["*Recent Telegram\\-triggered runs*"]
    for run in runs:
        state = run.get("status", "unknown")
        conclusion = run.get("conclusion")
        label = conclusion or state
        lines.append(f"• `{label}` — {messages.escape(run.get('html_url', ''))}")
    send_message(config.telegram_bot_token, chat_id, "\n".join(lines))


def handle_cancel(config: Config, chat_id: int) -> None:
    runs = github_client.recent_workflow_runs(
        config.github_token, config.github_owner, config.github_repository, config.github_workflow_file, limit=5
    )
    active = next((r for r in runs if r.get("status") in ("queued", "in_progress")), None)
    if not active:
        send_message(config.telegram_bot_token, chat_id, "Nothing is currently running\\.")
        return
    ok = github_client.cancel_run(config.github_token, config.github_owner, config.github_repository, active["id"])
    text = "🛑 Cancel requested\\." if ok else "⚠️ Could not request cancellation\\."
    send_message(config.telegram_bot_token, chat_id, text)


def handle_task_message(config: Config, chat_id: int, text: str, replied_text: str | None) -> None:
    parent = tasks.parse_task_reference(replied_text)
    if parent and not parent["session_id"]:
        # The reply targets a task's "in progress" message: recognizable
        # (it now carries a footer too) but not resumable, since a session
        # id only exists once claude-code-action finishes. Dispatching here
        # would silently start an unrelated run instead of the follow-up
        # the user asked for.
        send_message(config.telegram_bot_token, chat_id, messages.STILL_RUNNING)
        return

    task_id = tasks.generate_task_id()

    dispatched = github_client.dispatch_task(
        config.github_token,
        config.github_owner,
        config.github_repository,
        task_id=task_id,
        chat_id=chat_id,
        prompt=text,
        parent_task_id=parent["task_id"] if parent else None,
        resume_session_id=parent["session_id"] if parent else None,
        base_branch=parent["branch"] if parent else None,
    )

    if not dispatched:
        send_message(config.telegram_bot_token, chat_id, messages.DISPATCH_FAILED)
        return

    send_message(
        config.telegram_bot_token,
        chat_id,
        messages.task_received(config.github_repo_full_name, task_id, text, is_followup=parent is not None),
    )
