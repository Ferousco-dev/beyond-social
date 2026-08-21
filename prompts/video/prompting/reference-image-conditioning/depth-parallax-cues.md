---
id: reference-image-conditioning-depth-parallax-cues
title: Composing depth layers into the reference so camera moves parallax
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, depth, parallax, camera-movement]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A reference image with clear foreground, midground, and background separation
gives a camera-move prompt something to parallax against; a flat, single-plane
reference forces any requested dolly or pan into a hollow, sliding-cutout look.

- Choose or compose references with at least one foreground element partially
  in frame (a doorway edge, an out-of-focus object, a plant) even if it's not
  the subject, it gives the model a near-camera layer to shift faster than the
  background.
- Note the depth layers in the prompt when a camera move is requested:
  "foreground [x] passes quickly, subject holds roughly steady, background
  drifts slowest," matching what real parallax looks like.
- Be cautious with camera moves on references that are essentially flat (a
  subject against a plain seamless backdrop); there's no depth information for
  the model to parallax, so a requested dolly usually just zooms instead of
  feeling three-dimensional.
- Deep focus (everything sharp) reads as more three-dimensional in motion than a
  single sharp plane against a smoothly blurred backdrop, because edges
  throughout the frame that the model can track and shift add more real
  parallax signal than a soft gradient can.

Why: parallax, the differential apparent motion of near and far objects as a
camera translates, is the single strongest visual cue a viewer's brain uses to
read footage as real 3D space rather than a flat image; a reference without
distinguishable depth layers gives the model no basis to generate that
differential motion, so it substitutes a uniform zoom or pan that reads as a
moving 2D image, not a camera in a room.

Example: reference includes a blurred plant stem in the near-left foreground,
subject in the midground, window in the background, prompt: "slow dolly right,
foreground plant shifts fastest, background holds."

Counter-example: subject shot flat against a seamless white studio backdrop,
prompting "camera moves through the space"; there's no depth cue at all, and the
result is a subject that appears to float and stretch rather than a camera
that's moved.
