---
id: model-kling-elements-multi-image-consistency
title: "Kling Elements: keeping multi-reference shots coherent"
category: video-prompting
subcategory: model-kling
tags: [elements, consistency, multi-image-reference, character-consistency]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Kling's Elements feature blends multiple reference images, a person, a
product, a background, into one generated shot, but it averages conflicting
cues rather than choosing one, so mismatched references produce a visibly
blended, uncanny result.

- Match lighting direction and color temperature across all reference images
  before combining them. The model does not relight references to match each
  other.
- Keep the subject's scale and camera distance roughly consistent across
  references. A close-up face reference plus a full-body reference produces
  proportion drift.
- Limit to the references that are actually load-bearing for the shot,
  usually two: subject plus product, or subject plus location. Every
  additional reference adds another constraint the model has to compromise on.
- State in the prompt which reference governs which part of the frame, "the
  product from the reference sits on the table exactly as shown, the woman
  from the reference stands beside it," rather than leaving the blend
  implicit.

Why: the model encodes each reference into the same latent space and
interpolates toward a composite that partially satisfies all of them, so any
attribute, lighting, scale, color grade, that isn't already aligned across
references gets an averaged, in-between value. That averaging is what
produces the flat, slightly-off blended look.

Example: subject reference and product reference both shot in soft daylight
from camera-left, prompt "she picks up the bottle from the reference, same
daylight direction as her portrait."
Counter-example: a subject reference lit warm and tungsten, combined with a
product reference shot under cool studio strobes — the render splits the
difference into a muddy, neither-warm-nor-cool cast across the whole frame.
