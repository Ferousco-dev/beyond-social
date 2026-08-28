import unittest

from lib.messages import ci_status, completed, failed


class TestCompletedReply(unittest.TestCase):
    def test_includes_reply_when_present(self):
        text = completed("task_1", {"reply": "Read the file, no change needed."})
        self.assertIn("Claude said:", text)
        self.assertIn("Read the file, no change needed\\.", text)

    def test_omits_reply_when_absent(self):
        text = completed("task_1", {})
        self.assertNotIn("Claude said:", text)


class TestFailedReply(unittest.TestCase):
    def test_includes_reply_when_present(self):
        text = failed("task_1", {"reply": "Hit a permission error."})
        self.assertIn("Claude said:", text)
        self.assertIn("Hit a permission error\\.", text)


class TestCiStatus(unittest.TestCase):
    def test_success_renders_without_task_footer(self):
        text = ci_status(True, {"workflow_name": "CI", "branch": "main", "run_url": "https://x"})
        self.assertTrue(text.startswith("✅"))
        self.assertIn("Branch: `main`", text)
        self.assertIn("Run: https://x", text)
        self.assertNotIn("task_", text)

    def test_failure_uses_cross_icon(self):
        text = ci_status(False, {"workflow_name": "Security"})
        self.assertTrue(text.startswith("❌"))

    def test_defaults_workflow_name(self):
        text = ci_status(True, {})
        self.assertIn("Workflow", text)


if __name__ == "__main__":
    unittest.main()
