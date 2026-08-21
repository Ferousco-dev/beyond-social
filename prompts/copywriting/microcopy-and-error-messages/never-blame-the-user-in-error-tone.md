---
id: microcopy-and-error-messages-never-blame-the-user
title: Error tone never blames the user
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, tone, voice, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

The grammatical subject of an error sentence carries blame even when nobody intends it: "you failed to" and "invalid" both put the fault on the person, when the more useful move is to describe the mismatch neutrally.

- Replace judgment adjectives ("invalid," "wrong," "bad") with a literal description of the mismatch.
- Use system-as-subject phrasing for system-caused failures ("we couldn't reach the server"), and neutral descriptive phrasing for input issues ("this field needs an @ symbol").
- Avoid exclamation points on error copy; they read as alarm or reprimand, not information.
- Skip excessive apology ("Oops! Sorry!") as much as skip accusation; both center the tone over the fix.
- Read the sentence back as if said aloud to a colleague — if it would sound like a correction of them personally, rewrite it.

Why: users conflate friction in the product with a judgment of their own competence, especially in an unfamiliar or high-stakes flow like generating paid output. A message that sounds like scolding raises the emotional cost of an error that was often trivial to begin with, and that emotional residue is what people remember and complain about, not the underlying bug.

Example: "This email address is missing an @ symbol."

Counter-example: "You entered an invalid email!" This assigns fault with "you," judges the input with "invalid," and escalates with the exclamation point, all for what is usually a one-character typo.
