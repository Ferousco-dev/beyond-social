---
id: character-consistency-across-shots-drift-order
title: Know what drifts first so you can spend review time correctly
category: video-quality
subcategory: character-consistency
tags: [character-consistency, quality-control, drift, review]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Identity drift across generated shots is not random; it follows a fairly consistent
order. Knowing that order tells you where to look first when reviewing output and
where to spend your anchoring effort.

The typical drift order, most fragile first:

- Hair (color, length, and especially fringe/parting) moves first and most, because
  hair has no rigid structure for the model to hold onto.
- Fine facial detail second: exact eyebrow shape, freckle placement, tooth alignment,
  the specific curve of a smile.
- Skin tone and undertone third, especially under different lighting prompts in
  different shots.
- Overall face shape and proportions fourth, usually the last thing to visibly shift,
  and the one viewers register as "this isn't the same person."
- Body build and height are comparatively stable unless the shot list spans very
  different framings (close-up sequence intercut with a wide full-body shot).

Why: the model reconstructs the image from noise each time, weighting whatever the
prompt makes salient. Rigid, high-information regions (skull shape, eye spacing) are
statistically easier for the model to hold constant than soft, high-variance regions
(hair strands, skin micro-texture), so anchoring effort is better spent on the fragile
attributes than on the ones that were never going to move much anyway.

Example: reviewing a 6-shot sequence, check hairline and part first, face shape last.
Counter-example: spending review time re-verifying that the character is still
"tall and athletic" in every shot while missing that the hair color quietly shifted
from black to dark brown between shot two and shot four.
