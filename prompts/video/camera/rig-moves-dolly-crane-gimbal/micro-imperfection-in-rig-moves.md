---
id: rig-moves-dolly-crane-gimbal-micro-imperfection-in-rig-moves
title: Prompt for one small imperfection per move
category: camera-movement
tags: [imperfection, realism, motion-curve, ai-look]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Generated video defaults to mathematically perfect motion curves, constant
velocity or a single clean ease, because that is the statistical average of
its training data. Real rig moves never move that cleanly, so imperfection
has to be requested on purpose.

- Add one small, specific irregularity per move: a slight speed hitch mid-
  push, a fraction of a degree of frame wander on an otherwise locked track,
  an operator's late correction as the subject changes direction.
- Keep it subtle and singular; one flaw per move reads as a human hand on the
  rig, three or more reads as broken or jittery footage.
- Vary where the imperfection lands across shots in the same piece; a
  repeated identical wobble every time reads as a filter, which is its own
  kind of tell.
- Place the imperfection at a moment that would plausibly cause it: a mid-
  move direction change, a subject's sudden movement, uneven ground.

Why: real dolly grips, crane operators, and gimbal walkers are compensating
for uneven ground, cable drag, and their own breathing in real time, and the
resulting motion has small, non-repeating irregularities that are
structurally different from a spline-interpolated curve. That structural
difference is what a trained eye, or a viewer's gut, picks up on even without
naming it.

Example: "slow dolly push-in with a slight hitch in speed just after the
first second, as if the operator briefly caught the track."

Counter-example: "perfectly smooth, constant-speed dolly push-in" — technically
correct and exactly the phrase that produces the glassy, over-stabilized
motion viewers now unconsciously associate with generated footage.
