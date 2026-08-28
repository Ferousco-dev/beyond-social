import unittest

from lib.telegram_client import _strip_markdown_escapes


class TestStripMarkdownEscapes(unittest.TestCase):
    def test_removes_escape_backslashes(self):
        self.assertEqual(_strip_markdown_escapes("a\\.b\\-c"), "a.b-c")

    def test_leaves_unescaped_text_untouched(self):
        self.assertEqual(_strip_markdown_escapes("plain text, no escapes"), "plain text, no escapes")

    def test_collapses_escaped_backslash(self):
        self.assertEqual(_strip_markdown_escapes("C:\\\\Users"), "C:\\Users")


if __name__ == "__main__":
    unittest.main()
