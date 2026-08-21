---
id: micro-interactions-toggle-switch-motion
title: Toggle switch spring motion
category: motion
subcategory: interaction-design
tags: [toggle, switch, spring, settings]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A toggle switch represents a physical mechanism, so its knob should move with a
slight overshoot-and-settle, not a flat linear slide, or it reads as a generic
sliding div rather than a switch.

- Knob travel duration 150-200ms using a spring-like curve such as
  `cubic-bezier(0.34, 1.56, 0.64, 1)`, which overshoots by roughly 5-8% before
  settling back to its final position.
- Crossfade the track's background color simultaneously with the knob's travel,
  not before or after it; a color change that lags the knob makes the switch
  look like two separate animations instead of one mechanism.
- Add a subtle squash-stretch to the knob during travel (compress ~2-3% along the
  axis of motion, expand slightly perpendicular to it) to suggest weight and
  contact, then let it round back to a perfect circle once it settles.
- Update the underlying state the instant the toggle is released, not after the
  animation finishes. The animation is purely visual feedback; gating real state
  changes behind it adds latency to something that should feel immediate and
  risks dropped taps if the user toggles again mid-animation.
- Keep the knob's resting shadow small and let it grow only marginally during
  travel; toggles are small controls and an oversized shadow reads as noise.

Why: a linear slide models the knob as an object sliding on a frictionless track,
which is not how a physical switch behaves; switches have detents and spring
tension that cause a small overshoot as the mechanism snaps into place. Matching
that overshoot in the animation curve is what makes a software toggle feel like it
has weight and a definite "on" and "off" position, rather than a shape that merely
relocated.

Example: `.knob { transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1); }`

Counter-example: a toggle that animates over 400ms with `ease-in-out` and only
commits the setting change after the animation's `transitionend` fires. A user
double-tapping to correct a mis-tap experiences a visible lag between their second
tap and the switch actually flipping back.
