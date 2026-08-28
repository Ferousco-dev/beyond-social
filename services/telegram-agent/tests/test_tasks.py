import unittest

from lib.tasks import generate_task_id, parse_task_reference, task_footer


class TestTaskId(unittest.TestCase):
    def test_format(self):
        task_id = generate_task_id()
        self.assertRegex(task_id, r"^task_\d{8}_[0-9a-f]{6}$")

    def test_unique(self):
        ids = {generate_task_id() for _ in range(50)}
        self.assertEqual(len(ids), 50)


class TestFooterRoundTrip(unittest.TestCase):
    def test_parses_task_id_only(self):
        footer = task_footer("task_20260828_abc123")
        parsed = parse_task_reference(f"✅ Completed.\n\n{footer}")
        self.assertEqual(parsed["task_id"], "task_20260828_abc123")
        self.assertIsNone(parsed["session_id"])
        self.assertIsNone(parsed["branch"])

    def test_parses_session_and_branch(self):
        footer = task_footer("task_20260828_abc123", session_id="sess-xyz", branch="claude/telegram-abc123")
        parsed = parse_task_reference(footer)
        self.assertEqual(parsed["task_id"], "task_20260828_abc123")
        self.assertEqual(parsed["session_id"], "sess-xyz")
        self.assertEqual(parsed["branch"], "claude/telegram-abc123")

    def test_no_footer_returns_none(self):
        self.assertIsNone(parse_task_reference("just a normal reply, no task here"))

    def test_none_input_returns_none(self):
        self.assertIsNone(parse_task_reference(None))


if __name__ == "__main__":
    unittest.main()
