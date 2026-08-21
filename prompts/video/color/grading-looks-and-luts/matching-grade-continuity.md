---
id: grading-looks-and-luts-matching-grade-continuity
title: Locking grade parameters across independently generated shots
category: color-grading
subcategory: grading-looks-and-luts
tags: [continuity, consistency, sequence, generation-drift]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Shots generated separately for one sequence are independent inferences and
must be locked to identical, explicit grade parameters — not just a "similar
mood" description — or they visibly drift in warmth, contrast, and saturation
from cut to cut.

The recipe:

- Define the grade as a repeatable parameter set: exact color temperature,
  contrast curve, saturation percentage, named LUT or stock reference.
- Repeat that exact language in every prompt in the sequence, not a re-described mood.
- Treat one reference frame as ground truth and describe new shots relative to it.
- Flag and regenerate any shot that reads warmer, cooler, or punchier than its neighbors before cutting.

Why: independent generations share no state, so a vague repeated instruction
like "cinematic warm tone" gets reinterpreted slightly differently every
time. Those small per-shot drifts are far more visible in a cut sequence,
where the eye directly compares adjacent shots, than in any single shot
viewed alone.

Example: "match shot 1: 5600K daylight white balance, shadows pushed to hue
195, highlights warm at hue 35, saturation -10%."

Counter-example: prompting each shot in a sequence with only "warm cinematic
grade" — produces a noticeably different warmth level per shot when cut together.
