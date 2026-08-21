---
id: micro-interactions-button-loading-morph
title: Button loading-state morph
category: motion
subcategory: interaction-design
tags: [loading-state, buttons, forms, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A button entering a loading state should keep its exact footprint and morph its
content in place, not swap abruptly or resize around a smaller spinner.

- Measure the button's rendered width before swapping content and lock it as a
  `min-width`, so the label-to-spinner swap never causes the button (or anything
  next to it) to shift.
- Crossfade the label out and the spinner in over ~150ms rather than an instant
  replace; a hard cut between two unrelated glyphs reads as a broken re-render.
- Set `pointer-events: none` and a disabled visual state the instant the press is
  registered, before the crossfade even starts. This closes the double-submit
  window that a slow network request would otherwise leave open.
- On success, morph the spinner into a checkmark (not straight back to the
  original label) and hold that state for 400-600ms before reverting or navigating
  away, so the confirmation is actually visible rather than flashing past.
- On failure, revert to the original label plus an inline error rather than a
  separate toast that competes for attention with the button itself.

Why: the button's footprint is a spatial anchor for the user's attention; letting
it resize when the spinner appears causes everything around it to reflow at the
exact moment the user is watching closely for a response. Disabling pointer events
before the animation finishes matters for a reason beyond polish: a real backend
request can complete in under 150ms on a fast connection, and if the button is still
clickable during the crossfade, a second real submission can fire before the first
one's response comes back.

Example: `<button style="min-width: 96px"><span class="crossfade">{state === 'loading' ? <Spinner/> : state === 'success' ? <Check/> : 'Save'}</span></button>`

Counter-example: a button that shrinks to a small circular spinner, causing the
label next to it to jump left, and that stays clickable throughout the request so
an impatient user's second click fires a duplicate form submission.
