---
id: b-roll-strategy-light-continuity
title: Match light direction and color temperature between a-roll and b-roll
category: editing
subcategory: continuity
tags: [lighting, color-temperature, continuity, generated-footage]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

When a-roll and b-roll are shot at different times, in different places, or
one is generated, the light needs to agree across the cut, or the sequence
will read as two unrelated shoots stitched together even if each shot looks
fine on its own.

- Note the key light's direction and quality (hard or soft, warm or cool) in
  the a-roll, and replicate it within roughly one stop and 300K in any b-roll
  cut against it.
- If the a-roll was shot near a window (soft, directional daylight), don't
  intercut a b-roll insert lit with flat, shadowless overhead light; it reads
  as a different room on a different day.
- For generated b-roll, prompt the light source explicitly ("soft window
  light from camera-left, slightly overcast") rather than leaving lighting
  unspecified and getting a generic, even wash.
- Carry a single color grade across a-roll and b-roll as one pass over the
  whole timeline rather than grading each source independently.

Why: continuity of light is one of the strongest subconscious cues that
footage was captured in one continuous shoot. Even a viewer with no technical
vocabulary registers a lighting mismatch as wrong, because real single-session
footage never places two clips with unrelated lighting logic back to back.

Example: a-roll shot in soft daylight from camera-left; the product insert is
prompted and graded to carry the same soft camera-left key light and matching
warm-neutral white balance.
Counter-example: cutting a warm, window-lit a-roll segment directly against a
cool, flatly-lit generated product shot with even light from all sides — the
product looks like it was shot in a different building entirely.
