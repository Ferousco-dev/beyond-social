import hashlib
import hmac
import json
import unittest
from unittest.mock import ANY, patch

from app import app
from lib.config import Config

SECRET = "cb-secret"

CONFIG = Config(
    telegram_bot_token="test-token",
    telegram_webhook_secret="test-secret",
    telegram_allowed_user_ids=frozenset({1}),
    github_token="gh-token",
    github_owner="owner",
    github_repository="repo",
    github_workflow_file="telegram-claude-task.yml",
    github_webhook_secret=SECRET,
)


def _post_callback(client, payload: dict):
    body = json.dumps(payload).encode()
    signature = "sha256=" + hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
    return client.post(
        "/api/github/callback",
        data=body,
        headers={"Content-Type": "application/json", "X-Callback-Signature": signature},
    )


class TestGithubCallbackMemory(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch("app.load_config", return_value=CONFIG)
    @patch("app.send_message", return_value=True)
    @patch("app.memory.record_task_outcome")
    def test_success_records_memory(self, mock_record, mock_send, mock_config):
        response = _post_callback(
            self.client,
            {"task_id": "task_20260828_abc123", "status": "success", "telegram_chat_id": 1, "task_title": "Fix it"},
        )

        self.assertEqual(response.status_code, 200)
        mock_record.assert_called_once_with(CONFIG, "task_20260828_abc123", "success", ANY)
        mock_send.assert_called_once()

    @patch("app.load_config", return_value=CONFIG)
    @patch("app.send_message", return_value=True)
    @patch("app.memory.record_task_outcome")
    def test_in_progress_does_not_record_memory(self, mock_record, mock_send, mock_config):
        response = _post_callback(
            self.client, {"task_id": "task_20260828_abc123", "status": "in_progress", "telegram_chat_id": 1}
        )

        self.assertEqual(response.status_code, 200)
        mock_record.assert_not_called()
        mock_send.assert_called_once()

    @patch("app.load_config", return_value=CONFIG)
    @patch("app.send_message", return_value=True)
    @patch("app.memory.record_task_outcome", side_effect=RuntimeError("boom"))
    def test_memory_failure_does_not_block_notification(self, mock_record, mock_send, mock_config):
        response = _post_callback(
            self.client, {"task_id": "task_20260828_abc123", "status": "failure", "telegram_chat_id": 1}
        )

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()


if __name__ == "__main__":
    unittest.main()
