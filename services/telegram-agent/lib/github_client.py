"""GitHub REST API client: dispatching the Telegram task workflow and
answering /status and /cancel by querying that workflow's recent runs live
(no local state is kept about which run belongs to which task).
"""

import logging

import requests

logger = logging.getLogger("telegram_agent.github")

_API_BASE = "https://api.github.com"
_TIMEOUT_SECONDS = 10


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def dispatch_task(
    token: str,
    owner: str,
    repo: str,
    task_id: str,
    chat_id: int,
    prompt: str,
    parent_task_id: str | None = None,
    resume_session_id: str | None = None,
    base_branch: str | None = None,
) -> bool:
    """Fires a `repository_dispatch` event that the telegram-claude-task
    workflow listens for. Returns False on any non-2xx response or network
    failure; the caller is responsible for telling the user.
    """
    url = f"{_API_BASE}/repos/{owner}/{repo}/dispatches"
    client_payload = {
        "task_id": task_id,
        "telegram_chat_id": chat_id,
        "prompt": prompt,
    }
    if parent_task_id:
        client_payload["parent_task_id"] = parent_task_id
    if resume_session_id:
        client_payload["resume_session_id"] = resume_session_id
    if base_branch:
        client_payload["base_branch"] = base_branch

    body = {"event_type": "telegram_claude_task", "client_payload": client_payload}
    try:
        response = requests.post(url, headers=_headers(token), json=body, timeout=_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning("repository_dispatch request failed: %s", type(exc).__name__)
        return False

    if response.status_code == 204:
        return True
    logger.warning("repository_dispatch rejected with status %s", response.status_code)
    return False


def recent_workflow_runs(token: str, owner: str, repo: str, workflow_file: str, limit: int = 3) -> list[dict]:
    url = f"{_API_BASE}/repos/{owner}/{repo}/actions/workflows/{workflow_file}/runs"
    params = {"event": "repository_dispatch", "per_page": limit}
    try:
        response = requests.get(url, headers=_headers(token), params=params, timeout=_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning("list workflow runs failed: %s", type(exc).__name__)
        return []
    if not response.ok:
        logger.warning("list workflow runs rejected with status %s", response.status_code)
        return []
    return response.json().get("workflow_runs", [])


def cancel_run(token: str, owner: str, repo: str, run_id: int) -> bool:
    url = f"{_API_BASE}/repos/{owner}/{repo}/actions/runs/{run_id}/cancel"
    try:
        response = requests.post(url, headers=_headers(token), timeout=_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning("cancel run failed: %s", type(exc).__name__)
        return False
    return response.status_code == 202
