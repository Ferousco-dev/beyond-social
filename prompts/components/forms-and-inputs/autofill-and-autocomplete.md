---
id: forms-and-inputs-autofill-and-autocomplete
title: Autofill and autocomplete attributes
category: component
subcategory: forms-and-inputs
tags: [forms, autofill, autocomplete, browser]
applicability:
  platforms: [web, mobile]
  productTypes: [auth, onboarding, e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Browsers and password managers can fill a form correctly only if the field's
name, type, and autocomplete attribute tell them precisely what the field
holds; guessing from a placeholder string is unreliable.

The recipe:

- Set the HTML autocomplete attribute to the exact token the spec defines
  (email, given-name, family-name, street-address, cc-number, new-password
  vs current-password) rather than leaving it unset or using a custom string.
- Distinguish new-password from current-password explicitly on signup versus
  login forms so the browser offers to generate a strong password only where
  it's appropriate.
- Use the correct input type (email, tel, number) even when you also validate
  with JavaScript, since type drives both mobile keyboard selection and
  autofill matching.
- Don't split a single logical field (like a full name or a card number) into
  multiple inputs unless each piece has its own correct autocomplete token;
  splitting an address into custom-labeled boxes without tokens breaks
  autofill entirely.
- Test autofill in an actual browser with saved data before shipping, since
  autocomplete bugs are invisible in an empty form and only show up once a
  real user has stored data to fill from.

Why: every field a user doesn't have to type by hand removes a chance to
mistype, abandon, or get frustrated, and autofill only engages when the
markup gives the browser an unambiguous signal — a plausible-looking label is
not that signal.

Example: `<input type="email" name="email" autocomplete="email">` paired with
`<input type="password" autocomplete="new-password">` on a signup form.

Counter-example: a custom multi-box "expiry" field split into two unlabeled
number inputs with autocomplete="off", which silently opts the field out of
autofill and forces manual entry on every return visit.
