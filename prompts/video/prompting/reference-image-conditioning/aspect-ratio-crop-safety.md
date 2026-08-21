---
id: reference-image-conditioning-aspect-ratio-crop-safety
title: Cropping the reference to the output aspect ratio before generation
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, aspect-ratio, cropping, platform-formatting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A reference image cropped tight to its target aspect ratio before generation
animates more predictably than one the pipeline has to reframe on the fly,
because any automatic crop or pad happens before motion is added and can clip
the exact region the action needs.

- Crop the reference to the exact output aspect ratio (9:16, 1:1, 16:9) yourself
  before submitting it; don't rely on the platform to letterbox or center-crop a
  mismatched source.
- Leave extra headroom and lead room in the direction any planned motion will
  travel; a subject cropped tight against the frame edge in the reference has
  nowhere to move into before clipping.
- For vertical formats sourced from horizontal photography, re-compose around
  the subject rather than pillarboxing the original frame with blurred fill;
  pillarboxed references often animate the blurred fill bars as if they were
  real depth, producing warping at the edges.
- Check the reference for critical information (hands, text, logo) sitting close
  to any edge that will be cropped; once trimmed to the platform ratio those
  elements can be gone entirely.

Why: automatic reframing is typically applied once, statically, before
generation, so it isn't aware of the motion the text will introduce; an action
that was safely centered in the original photo can end up partially cropped
once the source is force-fit to a different ratio, and the model then has to
animate around a composition it wasn't designed for.

Example: reformatting a landscape product photo into a tight 9:16 crop centered
on the product with clear space above for motion, done manually before upload.

Counter-example: submitting a 16:9 reference directly to a 9:16 pipeline and
letting it auto-pillarbox with blurred edge fill; the blurred bars can visibly
warp and ripple once the clip is in motion, an obvious synthetic tell.
