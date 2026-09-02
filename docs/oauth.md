# Social sign-in

Google, GitHub and Facebook sign-in, set up so that moving to a real domain
later is a change in two consoles and never a change in this repository.

## Why no code changes when the domain moves

Two redirects are involved and neither is written down in the code.

The **provider** redirects to Supabase, not to us:

```
https://rluswrevtevrrijaqowu.supabase.co/auth/v1/callback
```

That address belongs to the Supabase project. It does not contain our domain,
so it stays correct forever. Paste it into Google, GitHub and Facebook once and
never touch it again.

**Supabase** then redirects back to us, at whatever origin the browser was
already on. `SocialButtons` builds that from `window.location.origin`, so
localhost, a preview deployment and a real domain all work without being
configured anywhere.

The only thing that knows our domain is Supabase Auth's redirect allowlist,
which is a setting in its dashboard.

## Turning providers on

One environment variable decides which buttons appear:

```
NEXT_PUBLIC_AUTH_PROVIDERS=google,github,facebook
```

Empty or unset means password sign-in only, and the buttons and their divider
are not rendered at all. Unknown names are ignored, so a typo costs one button
rather than the page. Order in the list is the order on screen.

## Per provider

Each needs its client id and secret pasted into **Supabase Dashboard →
Authentication → Providers**, not into this repository. They are never in our
environment, because the exchange happens on Supabase's side.

### Google

Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Web
application.

- Authorised redirect URI: the Supabase callback above
- Authorised JavaScript origins: the app's origin, updated when the domain
  changes

### GitHub

Settings → Developer settings → OAuth Apps → New OAuth App.

- Authorization callback URL: the Supabase callback above
- Homepage URL: the app's origin, cosmetic, update it when convenient

### Facebook

developers.facebook.com → your app → Facebook Login → Settings.

- Valid OAuth Redirect URIs: the Supabase callback above
- Facebook requires a privacy policy URL and a live HTTPS domain before the app
  leaves development mode, so only your own test users can sign in until a real
  domain exists.

### TikTok, and why it is not here

Supabase Auth has no TikTok provider, so a TikTok sign-in button could only
fail. It is deliberately absent from `SUPPORTED_PROVIDERS` rather than shown
and broken.

TikTok is still connected, just not as a way to log in. That happens after
sign-in through the publishing flow in `lib/social`, which runs its own OAuth
against our own callback at `/api/social/tiktok/callback` and is built from
`NEXT_PUBLIC_APP_URL`. That one **does** contain our domain, so it is the
redirect that has to be re-pasted into the TikTok, Meta and Google publishing
consoles when the domain changes. Same for Instagram and YouTube.

So the split is:

| Purpose               | Redirect points at | Changes with our domain |
| --------------------- | ------------------ | ----------------------- |
| Signing in            | Supabase           | No                      |
| Connecting to publish | Our own app        | Yes                     |

## When the real domain arrives

1. Set `NEXT_PUBLIC_APP_URL` to it.
2. Add the new origin to Supabase Auth → URL Configuration → Redirect URLs, and
   set Site URL to it.
3. Re-paste the publishing callbacks into the TikTok, Meta and Google consoles.

No code changes, in this feature or in the publishing flow.

## What is not covered

Account linking. Somebody who signs up with a password and later uses Google
with the same address gets whatever Supabase's linking setting says, which is
its default until somebody chooses otherwise. Worth deciding before launch
rather than after two accounts exist for one person.
