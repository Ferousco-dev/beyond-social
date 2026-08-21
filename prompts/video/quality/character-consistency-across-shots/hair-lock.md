---
id: character-consistency-across-shots-hair-lock
title: Over-specify hair, because it is the single highest-drift feature
category: video-quality
subcategory: character-consistency
tags: [character-consistency, hair, continuity, prompting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Hair is the single most volatile identity feature across generated shots, more
volatile than face shape, so it needs more prompt detail than every other feature,
not the same amount.

The recipe:

- Specify color as a named shade, not a category: "warm chestnut brown," not "brown."
- Specify length against a body landmark: "hits just below the collarbone," not
  "medium length," which the model interprets inconsistently shot to shot.
- Specify the part and texture together: "center part, loose waves," since part
  position is one of the fastest things to silently flip side to side between shots.
- If the character sometimes wears hair up and sometimes down within one sequence,
  say so explicitly per shot rather than letting the model default; defaults vary.
- Re-anchor hair description in every shot prompt, even mid-sequence, rather than
  assuming it will carry over from shot one, since it is the attribute most likely to
  be silently reinterpreted.

Why: hair has no rigid geometric skeleton the way a skull or jaw does, so the model
has enormous freedom to reinterpret it each generation, and unlike wardrobe there is
no single "type" word that pins it down the way "cardigan" pins down a garment.

Example: "warm chestnut brown hair, center part, loose waves, hits just below the
collarbone" repeated verbatim across all six shots.
Counter-example: prompting "long brown hair" once and letting each subsequent shot
regenerate the length, part, and wave pattern from scratch.
