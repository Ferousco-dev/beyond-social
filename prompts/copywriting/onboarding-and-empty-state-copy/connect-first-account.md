---
id: onboarding-and-empty-state-copy-connect-first-account
title: The first platform-connection empty state explains the unlock before the OAuth handoff
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [empty-state, oauth, social-connect, onboarding]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

An empty "no connected accounts" state sits right before an OAuth handoff to a
third party, so its copy has to do the persuasion the OAuth screen itself
won't: stating what becomes possible once connected, rather than describing
the absence of a connection.

- Name the capability unlocked, specific to that platform: "Connect TikTok to
  post directly, no downloading and re-uploading," not "Connect your
  accounts."
- List exactly what permissions will be requested and why, before the OAuth
  redirect, so the third-party consent screen doesn't surprise the user.
- Show what still works without a connected account, "you can still download
  videos and post manually," so declining doesn't feel like a dead end.
- Use the platform's own name and icon, not a generic "social account"
  placeholder. Specificity here signals the integration is real and tested.
- If reconnection is ever needed after an expired token, reuse this same
  explanatory pattern rather than a bare "Reconnect" button with no context.

Why: OAuth consent screens are controlled by the platform, not the product,
and list permissions in their own technical language. The product's own
empty-state copy is the only place to translate "read and write access to
your account" into the actual benefit, which is what determines whether the
user completes the flow or abandons at the platform's screen.

Example: "Connect TikTok to publish videos straight from Beyond Social. We'll
only ever post when you tap Publish."
Counter-example: "No accounts connected. Connect an account to get started."
This skips the specific benefit and the trust reassurance, both of which
matter more here than in a generic empty state because a third-party
permission screen follows immediately.
