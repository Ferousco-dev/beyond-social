---
id: model-veo3-aspect-ratio-framing
title: Compose for the delivery aspect ratio, not a crop of it
category: video-prompting
tags: [aspect-ratio, framing, composition, vertical-video]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Veo 3 bakes composition into the shot at generation time for whichever
aspect ratio is requested, commonly 16:9 landscape or 9:16 vertical
depending on the tool. Framing composed for one ratio doesn't survive a naive
crop to another, so plan the composition for the ratio the final placement
needs.

Practice:

- State the target aspect ratio and compose the subject inside it
  explicitly. For 9:16 vertical, keep the subject centered with headroom
  that survives a tight crop. For 16:9, use the extra width for environment
  and negative space rather than leaving it as dead air.
- Don't describe a wide two-shot or a landscape environment for a clip that
  will be delivered vertical. The composition fights the frame and forces an
  ugly crop later.
- For vertical delivery, favor closer shot sizes, medium or close-up, where
  the subject naturally fills a tall narrow frame, over wide establishing
  shots composed for width.
- If the same shot must serve both a square and vertical placement, generate
  at the wider ratio with generous headroom and side margin so a center-crop
  to the narrower ratio still holds the subject correctly, rather than
  reusing one tight vertical composition for both.

Why: aspect ratio is a framing decision the model bakes into the shot at
generation time, not a container applied afterward. Specifying it up front,
and composing for it explicitly, avoids the dead-space-or-crop tradeoff that
comes from generating one ratio and repurposing it for another platform's
placement.

Example: "Vertical 9:16, medium close-up, subject centered with headroom for
a caption overlay near the top third."
Counter-example: generating a wide 16:9 establishing shot with the subject
small in the center-left, then center-cropping it to 9:16 for TikTok and
losing the subject off one edge.
