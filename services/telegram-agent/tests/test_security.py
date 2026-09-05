import unittest

from lib.security import is_authorized_user, verify_callback_signature, verify_telegram_secret


class TestAllowlist(unittest.TestCase):
    def test_authorized_user_allowed(self):
        self.assertTrue(is_authorized_user(123, frozenset({123, 456})))

    def test_unknown_user_rejected(self):
        self.assertFalse(is_authorized_user(999, frozenset({123, 456})))


class TestTelegramSecret(unittest.TestCase):
    def test_matching_secret_accepted(self):
        self.assertTrue(verify_telegram_secret("s3cret", "s3cret"))

    def test_missing_header_rejected(self):
        self.assertFalse(verify_telegram_secret(None, "s3cret"))

    def test_wrong_secret_rejected(self):
        self.assertFalse(verify_telegram_secret("wrong", "s3cret"))

    def test_non_ascii_header_rejected_not_raised(self):
        self.assertFalse(verify_telegram_secret("héllo", "s3cret"))


class TestCallbackSignature(unittest.TestCase):
    def test_valid_signature_accepted(self):
        import hashlib
        import hmac

        body = b'{"task_id": "task_1"}'
        secret = "shared-secret"
        digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_callback_signature(body, f"sha256={digest}", secret))

    def test_tampered_body_rejected(self):
        import hashlib
        import hmac

        body = b'{"task_id": "task_1"}'
        secret = "shared-secret"
        digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        tampered = b'{"task_id": "task_2"}'
        self.assertFalse(verify_callback_signature(tampered, f"sha256={digest}", secret))

    def test_missing_prefix_rejected(self):
        self.assertFalse(verify_callback_signature(b"{}", "deadbeef", "secret"))

    def test_missing_header_rejected(self):
        self.assertFalse(verify_callback_signature(b"{}", None, "secret"))

    def test_non_ascii_signature_rejected_not_raised(self):
        self.assertFalse(verify_callback_signature(b"{}", "sha256=héllo", "secret"))


if __name__ == "__main__":
    unittest.main()
