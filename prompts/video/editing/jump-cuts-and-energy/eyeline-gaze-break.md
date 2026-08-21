---
id: jump-cuts-and-energy-eyeline-gaze-break
title: Let the gaze break across the cut
category: editing
subcategory: generation-technique
tags: [jump-cut, eyeline, gaze, ai-look]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

In a jump-cut talking-head sequence, letting the subject's eyeline or head
position shift slightly between cuts, rather than forcing an exact match,
reads as more natural, because real people never hold perfectly still between
two takes.

- Allow a small head-angle or eye-direction difference across the cut, a few
  degrees is enough, rather than pixel-matching the pose.
- When generating separate clips, don't over-specify "identical head
  position" in every prompt; pin the framing and setting precisely, leave
  micro-pose to vary naturally.
- Avoid the opposite failure too: a full look-away or eyes-closed frame
  landing exactly on the cut point looks like a caught blink. Nudge the cut a
  few frames to dodge it.
- A natural blink is useful cut cover on its own; a cut placed just after one
  hides the discontinuity almost as well as a whip pan.

Why: perfect pose-matching between two takes is itself a giveaway, either of
over-rehearsed reshoots or of synthetic generation, because unscripted human
movement is never that exact. A slight, uncontrolled variation is what a real
single-camera interview looks like when two separate moments get spliced.

Example: "allow natural micro-variation in head tilt and gaze between the two
clips; don't force identical pose."

Counter-example: prompting every clip with "exact same head position, exact
same eye direction" to make the cut invisible. The sequence ends up looking
locked-down and artificial, closer to a repeating loop than an edit.
