---
id: keyboard-and-focus-management-autofocus-pitfalls
title: When autofocus helps and when it disorients
category: accessibility
subcategory: keyboard-and-focus-management
tags: [autofocus, forms, disorientation, mobile]
applicability:
  platforms: [web, mobile]
  productTypes: [auth, onboarding, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

The HTML `autofocus` attribute moves focus the instant the page or component
mounts, before the user has read anything — appropriate for a handful of
single-purpose screens and actively harmful on most others.

- Reserve it for screens whose entire purpose is one field: a search-only
  landing page, a single-input "join the waitlist" form, a password field
  on a re-auth prompt where the context is already obvious.
- Never autofocus a field on a page with meaningful content above it (a
  hero, an explanation, terms of service) — it silently scrolls the viewport
  to the field and skips the content a sighted user would otherwise read
  first.
- On mobile web, autofocusing a text input pops the on-screen keyboard
  immediately on load, covering half the viewport before the user asked for
  it — treat this as a UX cost even when it's technically "accessible."
- Never autofocus inside content that loads asynchronously after the
  initial page focus has already gone somewhere reasonable (a skip link, a
  heading) — a late-arriving autofocus yanks focus away from wherever the
  user has already moved to.
- If in doubt, don't autofocus and instead make the intended first field
  the first Tab stop in a logical order — this respects a user who just
  landed on the page for a reason other than instant data entry.

Why: autofocus overrides a decision the browser and the user's own tabbing
behavior normally make together; using it removes that choice on every
single page load, for every visitor, whether or not this particular visit
was to fill in that field.

Example: a single-field "search flights" landing page that autofocuses the
destination input, since the entire page exists for that one interaction.

Counter-example: a blog post's newsletter-signup form embedded mid-article
that autofocuses its email input on mount — the page silently jumps and
scrolls to the form the instant it loads, before the reader has read a
single paragraph.
