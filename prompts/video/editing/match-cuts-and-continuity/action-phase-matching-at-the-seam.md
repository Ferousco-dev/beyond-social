---
id: match-cuts-and-continuity-action-phase-matching
title: Matching the exact action phase at the cut
category: editing
subcategory: continuity
tags: [action-match, gesture, cut-point, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Even perfect identity, lighting, and lens matching will still pop at the cut if
the pose itself skips or reverses a beat, because the body reads motion continuity
frame by frame, not scene by scene.

- Identify the exact frame where the cut lands and describe that body or object
  configuration at the end of clip A and the start of clip B, such as "hand at 80
  percent extension toward the cup, fingers just beginning to curl."
- Prefer cutting mid-gesture over cutting at rest; a hand fully extended or fully
  retracted gives the model a less specific target to match than a mid-point does.
- Where possible, generate a short overlap of the same action from both clips and
  trim to the frame where the phase lines up, rather than trusting one take from
  each generation to agree.
- Treat cyclical actions (a nod, a step, a blink) as phase-locked loops and know
  which half-cycle the cut lands on before writing either prompt.

Why: continuity of light and identity establishes that it is the same person and
place, but continuity of action phase is what convinces the body that no time or
movement was skipped, and it is the detail most often left unspecified.

Example: clip A ends "hand 80 percent extended, fingers curling"; clip B opens
"hand completing the reach, fingers now closing around the cup."
Counter-example: clip A ends with the hand already resting on the cup; clip B
opens with the hand mid-reach, several inches back, so the action visibly rewinds.
