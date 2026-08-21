---
id: microcopy-and-error-messages-actionable-next-step
title: Every error names the next step
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, actionability, ux-writing, recovery]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Diagnosis without a next step just relocates the user's confusion; an error message earns its place on screen only if it also says what to do about it.

- Pair the diagnosis clause with an instruction verb in the same sentence or the line right below it.
- Make the button label match the instruction exactly, so the copy and the control say the same thing.
- If the user can't fix it themselves, say who is handling it and roughly when, instead of leaving a dead end.
- Never ship an error with only a generic "OK" or "Dismiss" as the sole control when a real action exists.
- If there are two valid paths (retry vs. change input), offer both rather than picking one for the user.

Why: an error is a decision point, and every additional beat of uncertainty between "this failed" and "here's what I do" costs completed tasks. Users satisfice: given no visible action, most will abandon rather than investigate. Naming the action collapses the decision to a single click and keeps the task alive.

Example: "Payment declined by your bank. Try a different card or contact your bank to authorize this charge." [Use a different card]

Counter-example: "Payment failed." shown with only an OK button. The user knows something didn't work but has no idea whether to retry, switch cards, or contact support, so they're left to discover the fix by trial and error.
