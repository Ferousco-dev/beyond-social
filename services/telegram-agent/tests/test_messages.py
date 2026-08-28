import unittest

from lib.messages import ci_status, completed, escape, failed, pr_event

REAL_RUN_URL = "https://github.com/Ferousco-dev/beyond-social/actions/runs/33133979478"


class TestEscape(unittest.TestCase):
    def test_escapes_reserved_characters(self):
        self.assertEqual(escape("a.b-c!d"), "a\\.b\\-c\\!d")

    def test_escapes_literal_backslash(self):
        # A raw backslash must become \\ itself, or it can swallow the
        # following character and produce an invalid escape sequence.
        self.assertEqual(escape("C:\\Users"), "C:\\\\Users")

    def test_url_survives_markdownv2(self):
        # Every '.' and '-' in a bare URL is a reserved MarkdownV2 character;
        # left unescaped, Telegram rejects the whole message and falls back
        # to unformatted plain text (the literal "\." bug reported live).
        escaped = escape(REAL_RUN_URL)
        self.assertIn("\\.com", escaped)
        self.assertIn("Ferousco\\-dev", escaped)


class TestCompletedReply(unittest.TestCase):
    def test_includes_reply_when_present(self):
        text = completed("task_1", {"reply": "Read the file, no change needed."})
        self.assertIn("Claude said:", text)
        self.assertIn("Read the file, no change needed\\.", text)

    def test_omits_reply_when_absent(self):
        text = completed("task_1", {})
        self.assertNotIn("Claude said:", text)

    def test_pr_url_is_escaped(self):
        text = completed("task_1", {"pr_url": "https://github.com/org/repo/pull/1"})
        self.assertIn("github\\.com", text)


class TestFailedReply(unittest.TestCase):
    def test_includes_reply_when_present(self):
        text = failed("task_1", {"reply": "Hit a permission error."})
        self.assertIn("Claude said:", text)
        self.assertIn("Hit a permission error\\.", text)

    def test_run_url_is_escaped(self):
        text = failed("task_1", {"run_url": REAL_RUN_URL})
        self.assertIn("github\\.com", text)
        self.assertNotIn("github.com", text)


class TestCiStatus(unittest.TestCase):
    def test_success_renders_without_task_footer(self):
        text = ci_status(True, {"workflow_name": "CI", "branch": "main", "run_url": REAL_RUN_URL})
        self.assertTrue(text.startswith("✅"))
        self.assertIn("Branch: `main`", text)
        self.assertIn("github\\.com", text)
        self.assertNotIn("task_", text)

    def test_failure_uses_cross_icon(self):
        text = ci_status(False, {"workflow_name": "Security"})
        self.assertTrue(text.startswith("❌"))

    def test_defaults_workflow_name(self):
        text = ci_status(True, {})
        self.assertIn("Workflow", text)


class TestPrEvent(unittest.TestCase):
    def test_merged(self):
        text = pr_event({"pr_event_kind": "merged", "pr_title": "Fix bug", "pr_url": REAL_RUN_URL})
        self.assertTrue(text.startswith("🟣"))
        self.assertIn("github\\.com", text)

    def test_closed_without_merging(self):
        text = pr_event({"pr_event_kind": "closed"})
        self.assertIn("without merging", text)

    def test_review_approved(self):
        text = pr_event({"pr_event_kind": "review", "review_state": "approved", "reviewer": "octocat"})
        self.assertTrue(text.startswith("✅"))
        self.assertIn("octocat approved a PR", text)

    def test_review_changes_requested_includes_body(self):
        text = pr_event(
            {
                "pr_event_kind": "review",
                "review_state": "changes_requested",
                "reviewer": "octocat",
                "review_body": "Please add a test.",
            }
        )
        self.assertTrue(text.startswith("🔴"))
        self.assertIn("Please add a test\\.", text)

    def test_unknown_kind_falls_back(self):
        text = pr_event({})
        self.assertIn("PR update", text)


if __name__ == "__main__":
    unittest.main()
