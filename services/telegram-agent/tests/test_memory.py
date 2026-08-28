import unittest
from unittest.mock import MagicMock, patch

import requests

from lib.config import Config
from lib.memory import record_task_outcome

BASE_CONFIG = Config(
    telegram_bot_token="test-token",
    telegram_webhook_secret="test-secret",
    telegram_allowed_user_ids=frozenset({1}),
    github_token="gh-token",
    github_owner="owner",
    github_repository="repo",
    github_workflow_file="telegram-claude-task.yml",
    github_webhook_secret="cb-secret",
)

CONFIGURED = Config(
    **{**BASE_CONFIG.__dict__, "supabase_url": "https://example.supabase.co", "supabase_service_role_key": "svc-key"}
)


class TestRecordTaskOutcome(unittest.TestCase):
    @patch("lib.memory.requests.post")
    def test_noop_when_not_configured(self, mock_post):
        result = record_task_outcome(BASE_CONFIG, "task_20260828_abc123", "success", {"task_title": "Fix it"})

        self.assertFalse(result)
        mock_post.assert_not_called()

    @patch("lib.memory.requests.post")
    def test_inserts_row_with_service_role_auth(self, mock_post):
        mock_post.return_value = MagicMock(status_code=201)

        result = record_task_outcome(CONFIGURED, "task_20260828_abc123", "success", {"task_title": "Fix it"})

        self.assertTrue(result)
        url, kwargs = mock_post.call_args
        self.assertEqual(url[0], "https://example.supabase.co/rest/v1/bot_memory")
        self.assertEqual(kwargs["headers"]["apikey"], "svc-key")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer svc-key")
        self.assertEqual(kwargs["json"]["task_id"], "task_20260828_abc123")
        self.assertIn("Fix it", kwargs["json"]["summary"])

    @patch("lib.memory.requests.post")
    def test_returns_false_on_rejected_status(self, mock_post):
        mock_post.return_value = MagicMock(status_code=401)

        result = record_task_outcome(CONFIGURED, "task_20260828_abc123", "success", {})

        self.assertFalse(result)

    @patch("lib.memory.requests.post")
    def test_returns_false_on_request_exception(self, mock_post):
        mock_post.side_effect = requests.ConnectionError()

        result = record_task_outcome(CONFIGURED, "task_20260828_abc123", "success", {})

        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
