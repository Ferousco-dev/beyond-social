"""Telegram message templates. Kept separate from the handlers so the
handlers stay focused on control flow, not string formatting.
"""

from lib.tasks import task_footer

WELCOME = (
    "👋 Connected. Send me an engineering task in plain language and I'll "
    "kick it off in the repository.\n\n"
    "Commands: /help /status /cancel"
)

HELP = (
    "*Commands*\n"
    "/status – recent Telegram\\-triggered runs\n"
    "/cancel – cancel the most recent in\\-progress run\n\n"
    "*Usage*\n"
    "Just send a message describing the task, e\\.g\\. “Fix the login "
    "redirect bug”\\.\n\n"
    "To follow up on a task, *reply* to the bot's message about it \\(the "
    "task footer is what lets me find the right context\\)\\."
)

UNAUTHORIZED = "⛔ Unauthorized."


def task_received(repository: str, task_id: str, prompt: str, is_followup: bool) -> str:
    verb = "Follow\\-up received" if is_followup else "Task received"
    return (
        f"\U0001f680 {verb}\\.\n"
        f"Repository: `{repository}`\n"
        f"Task: {escape(prompt)}\n\n"
        f"{task_footer(task_id)}"
    )

IN_PROGRESS = "\U0001f916 Claude is working…"

DISPATCH_FAILED = (
    "⚠️ Could not start the task \\(GitHub didn't accept the "
    "dispatch\\)\\. Nothing was run\\. Try again in a moment\\."
)


def completed(task_id: str, summary: dict) -> str:
    lines = ["✅ *Claude completed the task\\.*"]
    if summary.get("task_title"):
        lines.append(f"Task: {escape(summary['task_title'])}")
    if summary.get("branch"):
        lines.append(f"Branch: `{summary['branch']}`")
    if summary.get("pr_url"):
        lines.append(f"PR: {escape(summary['pr_url'])}")
    if summary.get("tests"):
        lines.append(f"Tests: {escape(summary['tests'])}")
    if summary.get("build"):
        lines.append(f"Build: {escape(summary['build'])}")
    if summary.get("reply"):
        lines.append(f"\nClaude said:\n{escape(summary['reply'])}")
    lines.append("")
    lines.append(task_footer(task_id, summary.get("session_id"), summary.get("branch")))
    return "\n".join(lines)


def failed(task_id: str, summary: dict) -> str:
    lines = ["❌ *Claude could not complete the task\\.*"]
    if summary.get("task_title"):
        lines.append(f"Task: {escape(summary['task_title'])}")
    if summary.get("reason"):
        lines.append(f"Reason: {escape(summary['reason'])}")
    if summary.get("run_url"):
        lines.append(f"Run: {escape(summary['run_url'])}")
    if summary.get("reply"):
        lines.append(f"\nClaude said:\n{escape(summary['reply'])}")
    lines.append("")
    lines.append(task_footer(task_id, summary.get("session_id"), summary.get("branch")))
    return "\n".join(lines)


def ci_status(success: bool, summary: dict) -> str:
    """Renders a repo-wide CI/deploy notification, not tied to any Telegram
    task — no task_footer, since there's no session to follow up on.
    """
    icon = "✅" if success else "❌"
    name = summary.get("workflow_name") or "Workflow"
    lines = [f"{icon} *{escape(name)}*"]
    if summary.get("branch"):
        lines.append(f"Branch: `{summary['branch']}`")
    if summary.get("commit_sha"):
        lines.append(f"Commit: `{summary['commit_sha'][:7]}`")
    if summary.get("actor"):
        lines.append(f"Triggered by: {escape(summary['actor'])}")
    if summary.get("run_url"):
        lines.append(f"Run: {escape(summary['run_url'])}")
    return "\n".join(lines)


_REVIEW_ICONS = {"approved": "✅", "changes_requested": "🔴", "commented": "💬"}
_REVIEW_VERBS = {"approved": "approved", "changes_requested": "requested changes on", "commented": "commented on"}


def pr_event(payload: dict) -> str:
    """Renders a PR merge/close/review notification. Independent of any
    Telegram task, same as ci_status() — no task_footer, since there's no
    session to follow up on and the PR may not have come from the bot.
    """
    kind = payload.get("pr_event_kind")
    if kind == "merged":
        lines = ["🟣 *PR merged*"]
    elif kind == "closed":
        lines = ["⚪ *PR closed without merging*"]
    elif kind == "review":
        state = (payload.get("review_state") or "").lower()
        icon = _REVIEW_ICONS.get(state, "💬")
        verb = _REVIEW_VERBS.get(state, "reviewed")
        reviewer = escape(payload.get("reviewer") or "Someone")
        lines = [f"{icon} *{reviewer} {verb} a PR*"]
    else:
        lines = ["📬 *PR update*"]

    if payload.get("pr_title"):
        lines.append(f"Title: {escape(payload['pr_title'])}")
    if payload.get("pr_author"):
        lines.append(f"Author: {escape(payload['pr_author'])}")
    review_body = (payload.get("review_body") or "").strip()[:3000]
    if kind == "review" and review_body:
        lines.append(f"\n{escape(review_body)}")
    if payload.get("pr_url"):
        lines.append(f"PR: {escape(payload['pr_url'])}")
    return "\n".join(lines)


def escape(text: str) -> str:
    """Escapes Telegram MarkdownV2 special characters in user-derived text,
    including URLs — a bare '.' or '-' in an unescaped URL is enough to make
    Telegram reject the whole message and fall back to unformatted plain
    text, which is what previously made messages with a Run/PR link show up
    full of stray backslashes.
    """
    special = "\\_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{c}" if c in special else c for c in text)
