---
id: micro-interactions-press-feedback
title: Press and active-state tactile feedback
category: motion
subcategory: interaction-design
tags: [press, active-state, tactile, buttons]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, e-commerce, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A pressed state must confirm physical contact the instant contact happens, which
means it needs its own timing and its own trigger, separate from hover.

- Scale the element down 2-4% (`transform: scale(0.97)`) and drop opacity slightly
  (to ~0.9) on press, never scale up: pressing something down is a compression
  gesture, not an expansion.
- Duration under 100ms with a linear or slight ease-out curve. There is no
  "settle" phase to wait for; the feedback needs to be there before the user's
  brain finishes registering that they made contact.
- Reduce or remove the element's shadow while pressed so it visually sits flush
  with the surface, reinforcing the "pushed in" read alongside the scale change.
- Trigger on `pointerdown`, not on `click`. Click fires only after a full
  press-and-release cycle completes, which means anything bound to click alone
  gives zero feedback during the moment the finger or cursor is actually down.
- Release the pressed state on `pointerup` or `pointercancel` so a press that
  drags off the element and is released elsewhere doesn't leave the control
  stuck in its compressed state.

Why: pressed feedback closes the perception loop between "I did something" and
"the system noticed" before the actual result (a network response, a page change)
has had time to arrive. Users have a physical mental model of buttons carried over
from real-world switches; a control that only changes on hover gives no signal that
a click actually registered, which is why people double-tap or double-click things
that were already working.

Example: `button:active { transform: scale(0.97); opacity: 0.9; transition: transform 80ms linear; }`

Counter-example: a button whose only visual states are default and hover, with the
press feedback deferred to whatever the click handler eventually renders 300ms later.
Users perceive the delay as the button not responding and tap it again.
