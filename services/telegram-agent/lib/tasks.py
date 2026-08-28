"""Task identity and the zero-storage follow-up mechanism.

There is deliberately no database. A task's identity round-trips through
GitHub Actions in the `client_payload` / callback body, and a follow-up
message is correlated to its parent task by having the user reply (Telegram
`reply_to_message`) to one of the bot's own status messages, which always
carries a machine-readable footer. See README.md, "How state works".
"""

import re
import secrets
from datetime import datetime, timezone

_TASK_ID_RE = re.compile(r"task_(\d{8})_([0-9a-f]{6})")
_SESSION_RE = re.compile(r"session:([A-Za-z0-9_-]+)")
_BRANCH_RE = re.compile(r"branch:([^\s`]+)")


def generate_task_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"task_{stamp}_{secrets.token_hex(3)}"


def task_footer(task_id: str, session_id: str | None = None, branch: str | None = None) -> str:
    """Compact, parseable line appended to every bot message about a task.

    Kept on its own line, monospaced, so it reads fine to a human and is
    still trivial to regex back out of a Telegram `reply_to_message.text`.
    """
    parts = [task_id]
    if session_id:
        parts.append(f"session:{session_id}")
    if branch:
        parts.append(f"branch:{branch}")
    return "`" + " ".join(parts) + "`"


def parse_task_reference(replied_text: str | None) -> dict | None:
    """Extracts a prior task's identity out of the message being replied to.

    Returns None when the text carries no recognizable footer, which the
    caller treats as "no parent task, this is a fresh request."
    """
    if not replied_text:
        return None
    task_match = _TASK_ID_RE.search(replied_text)
    if not task_match:
        return None
    session_match = _SESSION_RE.search(replied_text)
    branch_match = _BRANCH_RE.search(replied_text)
    return {
        "task_id": task_match.group(0),
        "session_id": session_match.group(1) if session_match else None,
        "branch": branch_match.group(1) if branch_match else None,
    }
