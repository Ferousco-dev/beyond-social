# Password reset email

The reset email is sent by our own API through Resend. Supabase's built-in email sender
is not used for it.

## Setup

1. Add the Resend API key in the admin console: Providers > Payments and email > `resend_api_key`.
2. Set the sender address in the admin console (billing email settings). Until your own
   domain is verified in Resend, leave it on the default `onboarding@resend.dev`, which
   delivers only to the email address that owns the Resend account. Test with that address,
   and swap in a real sender once the domain is verified.
3. Render (API): `WEBSOCKET_ALLOWED_ORIGINS` must start with the web address,
   `https://beyond-social-omega.vercel.app`. The link in the email is built from the first entry.
4. Nothing to set on Supabase for this flow: no SMTP, no email template.

## How it runs

1. Forgot password sends the email address to `POST /api/v1/auth/password-reset`.
2. The API asks Supabase for a one-time recovery token (admin `generate_link`, which sends nothing)
   and emails `<web address>/reset-password?token_hash=...` through Resend.
3. The page opens from that link. The token is spent when the new password is submitted, not when
   the page opens, so a mail scanner that fetches the link cannot use it up.
4. The server exchanges the token for a session, sets the password, ends the session, and sends the
   person to sign in.

The API answers the same way whether or not the address has an account, mails an address at most
once a minute, and never lists who is registered. A link that is expired or already used sends the
person back to forgot-password with a message.
