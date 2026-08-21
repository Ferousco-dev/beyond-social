---
id: microcopy-and-error-messages-specificity-over-vague-errors
title: Specificity beats vague error copy
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, specificity, clarity, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A vague error like "Something went wrong" tells the user nothing they can act on, and the ambiguity erodes trust faster than the failure itself did.

- Name the object that failed ("your clip," "the upload," "this field"), not the system in the abstract.
- State the reason if it's known, in plain language, not an internal code name.
- Distinguish a system-caused failure from a user-input problem; the two need different fixes.
- Surface an error code or ID only as a small secondary line for support, never as the headline message.
- Never let a raw stack trace, HTTP status, or exception class be the primary text the user reads.

Why: users read an error to decide what to do next, not to be informed that failure occurred. A message that only announces failure forces them to guess, retry blindly, or contact support for information the system already had. Specificity converts a dead end into a decision the user can make in one read, which is the entire job of the message.

Example: "Your 45-second clip couldn't render because the source image is under 512px. Upload a larger image and we'll retry automatically."

Counter-example: "Error 500: Something went wrong. Please try again later." This hides which part of the process failed, gives no indication of whether retrying will help, and reads identically whether the cause was a bad upload or a server outage.
