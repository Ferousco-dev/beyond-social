---
id: model-kling-start-end-frame-interpolation
title: Using start-and-end-frame mode for controlled transformation
category: video-prompting
subcategory: model-kling
tags: [start-end-frame, interpolation, transformation, control]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

When both a start frame and an end frame are supplied, Kling interpolates a
physically plausible path between them instead of inventing motion from a
text description alone, which makes it the most reliable way to get a
specific, controlled transformation rather than a roughly-described one.

- Use this mode when the exact end state matters, a product fully assembled,
  an outfit changed, a door fully open, rather than trying to describe that
  end state in words for a single-image prompt.
- Keep the two frames closer in composition than you might expect. The same
  camera position and framing between start and end produces a cleaner
  interpolated path than a start and end frame shot from different angles.
- Write the text prompt in this mode to describe the manner of the
  transition, speed, easing, what happens in between, since the two images
  already define the destination.
- Test with a static or simple camera first. Combining a moving camera with a
  demanding start-to-end interpolation stacks two hard problems into one
  generation.

Why: giving the model two ground-truth endpoints removes most of the
ambiguity a single-image-plus-text prompt has to resolve on its own, so the
model's job narrows from inventing a plausible video matching a description
to finding a smooth path between two known states, which is why this mode
tends to have fewer artifacts than open-ended generation of the same idea.

Example: start frame of a folded jacket on a chair, end frame of the same
jacket worn by the subject, prompt "subject picks up the jacket and puts it
on in one smooth motion, camera static."
Counter-example: start and end frames shot from noticeably different angles
with a moving-camera prompt layered on top — the model has to solve for
camera motion and a large compositional jump at once, and the result often
looks like a hard cut disguised as a dissolve.
