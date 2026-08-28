import unittest
from unittest.mock import patch

from lib import messages
from lib.commands import handle_task_message
from lib.config import Config
from lib.tasks import task_footer

CONFIG = Config(
    telegram_bot_token="test-token",
    telegram_webhook_secret="test-secret",
    telegram_allowed_user_ids=frozenset({1}),
    github_token="gh-token",
    github_owner="owner",
    github_repository="repo",
    github_workflow_file="telegram-claude-task.yml",
    github_webhook_secret="cb-secret",
)


class TestHandleTaskMessage(unittest.TestCase):
    @patch("lib.commands.github_client.dispatch_task")
    @patch("lib.commands.send_message")
    def test_reply_to_still_running_task_short_circuits(self, mock_send, mock_dispatch):
        replied_text = f"\U0001f916 Claude is working…\n\n{task_footer('task_20260828_abc123')}"

        handle_task_message(CONFIG, chat_id=1, text="also add a test", replied_text=replied_text)

        mock_dispatch.assert_not_called()
        mock_send.assert_called_once_with(CONFIG.telegram_bot_token, 1, messages.STILL_RUNNING)

    @patch("lib.commands.github_client.dispatch_task")
    @patch("lib.commands.send_message")
    def test_reply_to_completed_task_resumes_session(self, mock_send, mock_dispatch):
        mock_dispatch.return_value = True
        replied_text = "✅ Done.\n\n" + task_footer(
            "task_20260828_abc123", session_id="sess-1", branch="claude/telegram-abc123"
        )

        handle_task_message(CONFIG, chat_id=1, text="also add a test", replied_text=replied_text)

        mock_dispatch.assert_called_once()
        _, kwargs = mock_dispatch.call_args
        self.assertEqual(kwargs["parent_task_id"], "task_20260828_abc123")
        self.assertEqual(kwargs["resume_session_id"], "sess-1")
        self.assertEqual(kwargs["base_branch"], "claude/telegram-abc123")
        mock_send.assert_called_once()

    @patch("lib.commands.github_client.dispatch_task")
    @patch("lib.commands.send_message")
    def test_fresh_message_dispatches_without_parent(self, mock_send, mock_dispatch):
        mock_dispatch.return_value = True

        handle_task_message(CONFIG, chat_id=1, text="fix the login bug", replied_text=None)

        mock_dispatch.assert_called_once()
        _, kwargs = mock_dispatch.call_args
        self.assertIsNone(kwargs["parent_task_id"])
        self.assertIsNone(kwargs["resume_session_id"])
        self.assertIsNone(kwargs["base_branch"])


if __name__ == "__main__":
    unittest.main()
