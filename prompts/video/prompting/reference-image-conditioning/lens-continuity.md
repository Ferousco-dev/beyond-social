---
id: reference-image-conditioning-lens-continuity
title: Matching camera moves to the reference's own optical signature
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, cinematography, focal-length, depth-of-field]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The reference image already has a focal length, aperture, and camera height
baked into it, and the described camera move must be physically achievable by
that same lens, not an arbitrary move that contradicts the optics already
visible.

- Read the reference for its optical signature before writing the move:
  wide-angle images (converging verticals, stretched foreground) imply a
  handheld or gimbal camera close to the subject; compressed, shallow-depth
  images imply a longer lens further back.
- Don't prompt a push-in from a telephoto-compressed reference and expect
  wide-angle perspective distortion to appear partway through; focal length
  doesn't change mid-shot on a real lens without a zoom, and an unmotivated one
  reads as fake.
- Match depth-of-field logic: if the reference has a soft background, keep it
  soft as the camera moves; don't invent a rack focus the text never earned.
- State the implied lens explicitly when it's ambiguous: "35mm-equivalent
  perspective, camera stays roughly this distance from subject."

Why: the model uses the reference frame's perspective geometry as ground truth
for the first frame, then has to invent a consistent camera path for subsequent
frames from text alone; when the text implies a lens or distance the image's
geometry contradicts, the model splits the difference, producing warped,
geometrically unstable frames as the perspective fights itself.

Example: reference has visible wide-angle barrel distortion at frame edges,
prompt: "camera pushes in slightly, same wide perspective held throughout."

Counter-example: same wide reference, prompt: "cinematic telephoto compression,
background rushes closer" — the model can't retroactively swap lenses and will
smear the background instead of compressing it.
