---
id: microcopy-and-error-messages-session-expired-vs-unauthorized
title: Session-expired and not-authorized need different copy
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, auth, permissions, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, auth, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A timed-out session and a genuine lack of permission are different failures with different emotional reads and different recovery actions, and collapsing them into one generic "access denied" screen leaves both users worse off.

- For an expired session: "Your session timed out. Sign back in to continue," and preserve the unsaved draft behind the login redirect.
- For insufficient permission or plan: name what's required ("This feature needs a Team plan") and offer an upgrade or contact-owner path, not a login prompt.
- Never show a bare "401" or "Access denied" for either case; both are internal status codes, not user-facing explanations.
- Distinguish "you were logged out" from "you were never allowed here" explicitly, since a returning legitimate user reads the wrong one as an accusation.
- If the permission gap is temporary (an invite pending approval), say that instead of presenting it as a hard wall.

Why: a legitimate user who simply timed out after thirty idle minutes and a user who genuinely lacks the right plan need opposite next actions — one just needs to log back in, the other needs to upgrade or ask an admin — so a shared "access denied" message sends at least one of them down the wrong path and makes the timed-out user feel wrongly suspected.

Example: "Your session expired after 30 minutes of inactivity. Sign back in — your draft is saved."

Counter-example: "Access denied." shown identically whether the underlying cause is an expired token or an insufficient plan, leaving both users to guess which situation they're actually in.
