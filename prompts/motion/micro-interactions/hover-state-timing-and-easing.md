---
id: micro-interactions-hover-timing
title: Hover state timing and easing
category: motion
subcategory: interaction-design
tags: [hover, timing, easing, transitions]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, landing-page, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Hover feedback lives in a narrow timing window: fast enough to feel like a direct
response to the cursor, slow enough not to look like a flicker or a bug.

- Duration for color, background, and opacity hover changes: 120-180ms. Anything
  under 80ms reads as a snap; anything over 300ms reads as lag when a user is
  scanning several hoverable elements in a row.
- Use an ease-out curve for the hover-in transition (fast start, settling finish),
  such as `cubic-bezier(0.16, 1, 0.3, 1)`. Use a slightly quicker ease-in on the
  hover-out reverse so the element doesn't linger after the cursor has left.
- Scale the duration to the amount of visual change, not a flat number: a color
  shift can be near-instant, a shadow-and-lift combo needs the fuller 180-200ms
  to read as continuous motion rather than a jump cut.
- Never delay a hover response for feedback that has functional meaning (a link
  turning into its hover color signals "this is clickable"); reserve any delay
  for decorative expand/reveal effects only.
- Gate hover transitions behind `@media (hover: hover) and (pointer: fine)` so
  touch devices don't get a "stuck" hover state after a tap.

Why: hover is a continuous, reversible signal tied directly to cursor position, not
a discrete event like a click. Users move the cursor across a UI faster than they
consciously track it, so a hover transition has to complete inside roughly the same
window as a saccade-to-saccade eye movement, or it will visibly trail the cursor and
break the illusion that the interface is responding to them in real time.

Example: `transition: background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), color 150ms cubic-bezier(0.16, 1, 0.3, 1);`

Counter-example: a 600ms `ease-in-out` hover transition on every button in a toolbar.
As a user's cursor crosses several buttons quickly, each one is still mid-animation
when the next hover starts, producing a smeared, laggy trail instead of crisp feedback.
