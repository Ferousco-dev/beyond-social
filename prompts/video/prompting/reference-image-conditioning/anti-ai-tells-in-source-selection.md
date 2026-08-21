---
id: reference-image-conditioning-anti-ai-tells-source-selection
title: Rejecting references with stock-photo and AI-image tells
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, realism, source-selection, ai-look]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

The most common reason a reference-conditioned video still reads as
AI-generated is the reference image itself: perfect symmetry, dead-center
composition, and glassy over-smooth skin or surfaces are stock-photo and
AI-image conventions that the video model faithfully preserves and animates.

- Reject references with unnaturally even skin texture, no visible pores,
  blemishes, or flyaway hairs; that smoothness was likely already retouched or
  synthetic, and it will carry through and read as plastic once in motion.
- Reject perfectly centered, symmetric compositions with the subject facing
  dead-on to camera; real photography, even posed photography, has minor
  asymmetry from a photographer standing slightly off, a head not perfectly
  level, one shoulder lower.
- Look for at least one small imperfection to keep: a stray hair, an uneven
  fabric fold, a reflection that isn't perfectly clean; these give the model
  organic texture to preserve rather than a suspiciously flawless surface to
  smooth further.
- Prefer references with visible camera grain or natural sensor noise over
  denoised, upscaled, or heavily filtered images; the model treats noise as
  texture and maintains it as a believable film-like quality rather than the
  waxy look of over-processed sources.

Why: video models learn what looks "normal" partly from a training distribution
saturated with over-retouched commercial photography and synthetic images;
feeding one of those as a reference doesn't introduce imperfection into an
otherwise good system, it reinforces the exact bias that produces the AI look,
so the fastest lever available before writing a single word of prompt is simply
choosing a reference that already looks like an unretouched photograph.

Example: choosing a candid, naturally lit photo with visible skin texture and a
slightly off-center composition as the reference over a retouched studio
headshot.

Counter-example: sourcing a heavily beautified, symmetric, airbrushed portrait
as the reference and hoping prompt language like "natural, imperfect, real"
will undo it; the model has no imperfection in the source pixels to preserve,
so the result still reads as synthetic no matter what the text asks for.
