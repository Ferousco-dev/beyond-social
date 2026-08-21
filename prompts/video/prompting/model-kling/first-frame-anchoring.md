---
id: model-kling-first-frame-anchoring
title: Kling image-to-video anchors hard on the first frame
category: video-prompting
subcategory: model-kling
tags: [image-to-video, first-frame, composition, conditioning]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

In image-to-video mode, Kling treats the uploaded first frame as near-absolute
ground truth for composition, lighting, and lens character; the text prompt
only steers what happens after frame one, not how frame one looks.

- Fix any composition, framing, or lighting problem in the source image before
  upload. The prompt cannot recompose a badly cropped or flatly lit still.
- Match the prompt's implied lens and distance to the actual image; don't ask
  for "extreme close-up" motion on a wide establishing photo.
- If the source photo has flat, on-axis lighting, expect the generated motion
  to inherit that flatness. Describe a motivated light change only if the
  source has a visible light source to justify it, a window, a practical lamp.
- Crop quality and grain in the source carry through. A soft or
  over-sharpened still visibly limits the sharpness of every following frame.

Why: the model's video-diffusion process is conditioned on the first frame's
latent at every denoising step, so it is structurally biased toward
preserving that frame's optical qualities. The prompt only has leverage over
the delta from that frame, not over the base image itself.

Example: source photo shot with a longer lens (shallow depth of field, soft
background) plus prompt "subject turns head slowly toward camera, background
stays soft" — consistent with what the still already shows.
Counter-example: a flat, evenly-lit product photo with the prompt "dramatic
rim light sweeps across the product" — there's no light source in the source
to justify it, so the model either ignores the instruction or adds an
unmotivated glow that looks pasted on.
