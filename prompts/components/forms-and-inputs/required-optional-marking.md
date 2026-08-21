---
id: forms-and-inputs-required-optional-marking
title: Marking required versus optional fields
category: component
subcategory: forms-and-inputs
tags: [forms, labels, required-fields, clarity]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, auth, onboarding, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Most forms have more required fields than optional ones, so marking every
required field with an asterisk adds visual noise to the majority case instead
of flagging the exception.

The recipe:

- If required fields outnumber optional ones, label only the optional fields
  with "(optional)" in muted text after the label, and leave required fields
  unmarked.
- If optional fields outnumber required ones, flip it: mark only "(required)"
  or a single asterisk on the required fields.
- Never use an asterisk alone without a legend explaining what it means; state
  "* Required" once near the top of the form the first time it appears.
- Don't mark both required and optional on every field — pick whichever is the
  minority and mark only that one, so the eye only has to register exceptions.
- Keep the marking text-based ("optional") rather than color-only, since color
  alone doesn't survive grayscale printing, color blindness, or a quick glance.

Why: any marking system that annotates the majority case wastes attention on
information the user already assumes by default. Flagging only the minority
lets the asterisk or "(optional)" tag actually mean something when the eye
hits it, instead of becoming visual wallpaper repeated on every field.

Example: a checkout form with 7 required fields and 1 optional "Company name"
field — only "Company name (optional)" carries a label suffix.

Counter-example: every one of 8 fields carries a red asterisk, including the 7
required ones, so the single actually-informative signal (which field, if any,
is optional) is buried in repetition.
