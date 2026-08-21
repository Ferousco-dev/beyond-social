---
id: microcopy-and-error-messages-rate-limit-transparency
title: Rate-limit copy states the real wait time and cause
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, rate-limiting, throttling, transparency]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, short-form-video, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

An unexplained throttling refusal reads as a bug, and the natural response to an unexplained block is to rapid-retry, which is precisely the behavior that triggered the limit in the first place — transparency here actually reduces load rather than inviting abuse.

- State the concrete cooldown computed from the real limit ("try again in 40 seconds"), never a vague "too many requests."
- Explain the trigger in one clause (rapid regenerate clicks, concurrent renders) so it doesn't read as arbitrary.
- Auto-enable the retry control the instant the cooldown elapses, instead of leaving the user to guess and click early.
- Distinguish a per-user limit from a platform-wide capacity limit; the latter isn't caused by anything the user did.
- If the limit is about to reset very soon (under 10 seconds), let the button count down visibly rather than staying flatly disabled.

Why: users interpret an unexplained block as either a glitch or an accusation of misuse, and both readings produce more retry attempts, not fewer. A visible number gives them a reason to wait instead of a reason to test whether the block is real, which is what actually relieves pressure on the system doing the limiting.

Example: "You've started 3 renders in the last minute. You can start another in 40s." (button disabled, becomes active automatically at 0)

Counter-example: "Too many requests. Please slow down." gives no number, so the user keeps clicking every few seconds to test whether it's still blocked, generating exactly the load the limit exists to prevent.
