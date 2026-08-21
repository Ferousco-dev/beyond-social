---
id: troubleshooting-common-failures-product-label-warping-in-closeup
title: "Symptom: product labels and logos warp or drift in macro shots"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [product, logo, macro, identity-drift, label]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Symptom: a tight macro shot on a product's label, wordmark, or fine print
comes out with letterforms that bend, duplicate, or dissolve mid-shot, even
when the wider shots of the same product hold up fine. Text and logo
geometry is exactly the high-frequency, must-be-exact detail generative
video is worst at.

- Reserve true macro (filling the frame with the label) for the still
  reference image, and let video motion happen at a slightly wider distance
  where the wordmark reads but isn't the entire frame; the model has less
  precise geometry to sustain over time.
- On image-to-video, do not re-describe the label in the prompt at all —
  say "keep the label and text exactly as shown" and let the reference image
  carry the actual glyphs, rather than asking the model to regenerate them
  from a text description.
- Slow the camera to a near-static hold or a very slow push on any shot where
  the label must stay legible; drift and warping compound with camera speed.
- If a hero label shot is essential, plan for it as a separate short clip
  (2-3 seconds, minimal motion) rather than folding it into a longer dynamic
  sequence, and be ready to pick the best of several generations.
- Keep other elements of that shot simple (plain background, no competing
  detail) so the model's capacity isn't split between the label and the rest
  of the frame.

Why: type and logos are rigid, semantically exact shapes; the model has no
symbolic understanding of letters, so any dynamic regeneration of them across
frames is a coin flip, while a held or near-static shot only has to sustain
the geometry rather than reinvent it each frame.

Example: "slow, near-static hold on the bottle from the reference image, keep
the label and text exactly as shown, soft light sweep across the glass."
Counter-example: "fast macro orbit around the label, camera-left to right
handwritten cursive logo" — motion and re-described type together guarantee
drift.
