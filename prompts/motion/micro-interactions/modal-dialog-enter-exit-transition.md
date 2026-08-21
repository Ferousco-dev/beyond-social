---
id: micro-interactions-modal-transition
title: Modal dialog enter and exit transition
category: motion
subcategory: interaction-design
tags: [modal, dialog, overlay, transition]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, onboarding, e-commerce, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A modal's entrance should animate the dialog and its backdrop on synchronized but
independent timings, and the exit should run faster than the entrance, because
opening invites deliberation while closing should get out of the way.

- Entrance: backdrop fades in over 150-200ms while the dialog simultaneously
  scales from ~95% to 100% and fades in over the same window, ease-out,
  `transform-origin: center`.
- Exit: reverse both, but compress the duration to roughly 100-150ms, about 70%
  of the entrance's length. Closing doesn't need the same deliberate pacing as
  opening.
- Scale from slightly smaller rather than sliding in from an edge; scaling keeps
  the perceived origin point centered near the trigger, whereas an edge-slide
  implies the dialog traveled in from off-screen, which is a less accurate
  spatial story for something that opened in response to a click at that spot.
- Move focus into the dialog (its heading or first focusable element) only once
  it's visually settled, not before the animation starts, so focus doesn't land
  on a barely-visible target.
- Mark the background content `inert` (or `aria-hidden`) the instant the open
  animation begins, not after it finishes, and apply scroll lock at the same
  moment; release both only after the close animation completes, to avoid a
  visible content jump underneath the fading backdrop.

Why: the asymmetric timing matches how people actually want to use overlays,
willing to let an entrance take a beat to establish context, but wanting a
dismissal to feel immediate once they've decided they're done. Locking scroll and
inertness exactly at animation start (not open, not settle) matters concretely:
if either lags behind the animation, the page underneath can visibly shift or
remain briefly interactive while it's still partially obscured by the fading
backdrop, which looks like a bug rather than a transition.

Example: `.modal { transform: scale(0.95); opacity: 0; transition: transform 180ms ease-out, opacity 180ms ease-out; }` scaling to `scale(1)` on open.

Counter-example: a modal that closes using the identical 300ms animation and
timing used to open it, with scroll lock and inertness released only after that
full duration finishes. Dismissal feels sluggish, and for a brief window the
background content is technically scrollable while still visually dimmed behind
the closing overlay.
