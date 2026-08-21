---
id: match-cuts-and-continuity-color-temperature
title: Color temperature and white balance continuity
category: editing
subcategory: continuity
tags: [color-temperature, white-balance, grading, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Color temperature is a subconscious "where and when" cue, so it needs to be pinned
with a literal value and held across every clip the same way light direction and
identity are held.

- Give a literal Kelvin range or descriptor and reuse it verbatim: "3200K tungsten
  warm" or "5600K daylight neutral," not "warm lighting."
- Apply one grade or LUT to the whole stitched sequence in post rather than
  grading each clip independently, since even matched prompts drift slightly.
- Watch skin tone specifically; it is the fastest place a color mismatch becomes
  visible to a viewer.
- Avoid mixing generation providers or models mid-sequence without a unifying
  grade pass afterward, since different models carry different default color
  signatures.

Why: inconsistent white balance across a cut reads like a different camera or a
different room, even when framing and subject match perfectly, because color
temperature is one of the first things the visual system uses to judge whether two
shots belong to the same continuous moment.

Example: "warm tungsten 3200K, slight amber" specified identically across all
clips, with a single grade applied to the finished sequence.
Counter-example: clip one rendered warm and orange, clip two rendered cool and
blue, stitched together with no unifying grade pass to reconcile them.
