---
id: cognitive-load-and-progressive-disclosure-just-in-time-field-help
title: Just-in-time field help over upfront instructions
category: ux-heuristic
subcategory: progressive-disclosure
tags: [progressive-disclosure, forms, cognitive-load, contextual-help]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, onboarding, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Field-level guidance should appear when a field gains focus, not as a block of
instructions the user must read before they've decided which field they care
about — help disclosed on demand is read; help printed upfront is skipped.

The recipe:

- Attach format hints, character limits, and examples to the focus state of the
  field itself, shown inline below or beside it, not in a paragraph above the
  form.
- Trigger password rules, availability checks, and format validators only once
  the relevant field is active, and dismiss them the moment the field blurs
  with a valid value — don't leave solved problems on screen.
- Reserve a fixed height for the help slot so it doesn't push adjacent fields
  down when it appears; a layout shift on focus reads as an error even when
  none occurred.
- Never require reading ahead to fill a field correctly — if a later field's
  format depends on an earlier choice, restate the constraint at the moment
  it applies, don't assume it was retained from a memo two screens back.
- Keep one exception: irreversible or destructive fields (permanently deleting
  an account, revoking API access) get their consequence stated before the
  action is available, not just on focus, because "on demand" is too late.

Why: instructions printed above a form compete with every other piece of text
on the page for attention the user hasn't yet allocated to a specific field;
by the time they reach that field, the instruction has scrolled out of view or
was never read. Binding the help to the focus event delivers it at the exact
moment the user has a question, which is the only moment they're primed to
absorb the answer.

Example: a password field shows "8+ characters, one number" only while focused,
and replaces it with a green check the instant the value satisfies it.

Counter-example: a numbered list of eleven form rules sitting above an empty
form — by field six, the user has forgotten rule two and has to scroll back up.
