---
id: subject-consistency-descriptions-imperfection-markers
title: Using named imperfections as identity anchors
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, realism, imperfection, character-description]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A named asymmetry or small imperfection is a stronger identity anchor than any
number of generic positive traits, because it is statistically rare and hard for
a model to average away.

- Name one real asymmetry or mark: uneven eyebrow height, a slightly crooked nose,
  a mole at a specific location, a scar, a chipped tooth.
- Give the exact location using landmark language ("upper lip, right side," "left
  cheek, just below the eye") instead of a vague placement.
- Reuse the identical imperfection phrase across every shot and regeneration.
- Limit to one or two imperfections; stacking many competes for attention and
  raises the odds none of them render reliably.

Why: symmetric, "flawless" faces and bodies are exactly what video models regress
to by default, because that is the statistical center of their training data. A
specific, located imperfection breaks that gravitational pull toward the generic
average and doubles as a realism cue — real people are asymmetric, and a perfectly
even face is one of the fastest tells that footage is synthetic.

Example: "a small mole just below her left eye, right eyebrow arches slightly
higher than the left."

Counter-example: "a flawless, symmetrical face" — this is not neutral, it actively
steers generation toward the generic AI-average face and removes the one detail
that would have kept the subject recognizable shot to shot.
