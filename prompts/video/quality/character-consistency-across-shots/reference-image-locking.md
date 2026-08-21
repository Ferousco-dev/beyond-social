---
id: character-consistency-across-shots-reference-image-locking
title: Use a locked reference image, not text alone, to anchor identity
category: video-quality
subcategory: character-consistency
tags: [character-consistency, reference-image, seed, identity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Text descriptors alone cap how consistent a face can stay across shots. When the
pipeline supports image-conditioned generation (a reference frame, a face-lock, an
img2img start frame), feed the same source image into every shot instead of relying
on text to re-derive the face each time.

The recipe:

- Generate or select one clean, front-lit, neutral-expression reference frame first,
  treat it as the character's "hero plate," and reuse that exact file for every
  subsequent shot in the sequence.
- Prefer a reference shot at roughly the same distance and angle you'll use most in
  the sequence (a medium shot), since extreme reference angles transfer worse to
  other angles.
- If the tool allows a face-lock or identity-strength parameter, keep it high enough
  that identity survives but not so high that it fights natural head turns and
  expression change shot to shot.
- Never regenerate a new reference mid-sequence to "fix" a bad frame; fix the
  reference once, then re-render every downstream shot from the corrected one.
- Pair the reference image with the frozen text descriptor from the anchoring
  technique; the two reinforce each other rather than one substituting for the other.

Why: image conditioning gives the model actual pixel-level structure to match
(face geometry, proportions) that text can only approximate. Text alone forces the
model to re-imagine a face from a verbal spec every single generation, and small
sampling variance compounds into visibly different people over five or six shots.

Example: same reference PNG passed as the identity image for shots 1 through 6, each
with a different action/camera prompt layered on top.
Counter-example: generating a fresh "establishing" image for every new shot and hoping
the text description alone keeps the face the same — it will not survive past shot two.
