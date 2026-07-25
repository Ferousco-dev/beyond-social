---
id: motion-principles
title: Motion design principles
category: motion
tags: [motion, animation, easing, transitions]
applicability:
  platforms: [web, mobile]
  productTypes: []
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Motion should explain, not decorate. Its jobs are to show relationships (what came
from where), maintain continuity across state changes, and give feedback. If an
animation does not do one of those, cut it.

Craft: keep UI transitions short, roughly 150 to 250ms; use ease-out for elements
entering and ease-in for leaving. Animate transform and opacity, not layout, for
smoothness. Motion should have a source and destination, things grow from where
they were triggered. Always respect prefers-reduced-motion with a near-instant
fallback.

Why: well-timed motion reduces perceived cognitive load by preserving object
constancy; the user tracks one thing moving rather than reparsing a new screen.
Slow, gratuitous, or everywhere-at-once motion does the opposite and feels cheap.

Example: a new item scales and fades in from the button that created it over
180ms, ease-out. Counter-example: 600ms bounce on every card, parallax on scroll,
and spinners that animate for their own sake.
