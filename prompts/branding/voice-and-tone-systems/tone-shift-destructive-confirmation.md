---
id: voice-and-tone-systems-tone-shift-destructive-confirmation
title: Tone rules for irreversible and destructive actions
category: branding
subcategory: voice-and-tone
tags: [tone, confirmation, ux-writing, trust]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Delete, cancel-subscription, and remove-teammate flows are the one place a
brand's tone should almost fully retreat — the copy's job is to make the
consequence unambiguous, not to sound like the brand.

- State the consequence in concrete, literal terms: what is lost, whether it
  can be undone, and how long any grace period lasts — "this deletes 14
  videos and cannot be undone" beats "are you sure?"
- Drop brand personality markers (idioms, humor, exclamation points)
  entirely in the confirmation copy itself; personality can return in the
  surrounding UI, but not in the sentence carrying the warning.
- Match the verb on the confirm button to the actual action ("Delete
  project," not "Yes" or "Confirm") so the label alone communicates the
  stakes if a user skims past the body text.
- Use a neutral second-person register, not first-person-plural — this is
  about the user's decision, not the brand's relationship to them.
- Never soften severity with a qualifier that isn't true ("this will
  probably remove your data") — vague hedging where certainty exists reads
  as evasive.

Why: a destructive-action dialog is a legal-adjacent, trust-critical moment —
if the user makes an irreversible mistake because the copy was ambiguous or
distracted by brand voice, that failure is remembered longer than almost any
other interaction. Precision here is what earns the license to be playful
everywhere else.

Example: "Delete 'Q3 Launch' project? This removes 14 videos and can't be
undone." with a button labeled "Delete project."

Counter-example: "Sure you wanna say bye to this project? 👋" — the informal
register obscures the fact that the action is permanent and makes the
warning easy to skim past without registering the stakes.
