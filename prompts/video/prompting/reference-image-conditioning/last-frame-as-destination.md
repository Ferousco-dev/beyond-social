---
id: reference-image-conditioning-last-frame-destination
title: Writing the last frame as a resolved question, not a second photo
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, last-frame, narrative-arc, storytelling]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A last-frame reference should be authored as the resolution of the shot's
question, not as a second photo that merely looks nice, because the model reads
the gap between first and last frame as the entire dramatic arc it needs to
fill.

- Ask what changed and why the viewer should care (object revealed, expression
  shifted, action completed) before designing the last frame's exact
  composition.
- Keep one clear change per shot (the box opens, the smile appears, the product
  rotates into full view); stacking two unrelated changes into one last frame
  forces the model to sequence them arbitrarily.
- Preserve camera logic between the two frames: if the first frame is a static
  lockoff, the last frame shouldn't imply a completed dolly move the text never
  described.
- Leave the last frame slightly unfinished rather than a perfect final beat; a
  little settling motion left for a following cut feels more like real footage
  than a frame that looks posed to end exactly there.

Why: interpolation-based control treats the last frame as the shot's thesis
statement — everything generated in between is effectively an argument for how
you got there; a last frame that's just another pretty still with no causal link
to the first gives the model no argument to make, so it fills the middle with
generic drift instead of purposeful motion.

Example: first frame: closed gift box. last frame: lid tilted up with one corner
of tissue paper visible, not fully open. text: "lid lifts, paper begins to
show."

Counter-example: first frame closed box on a table, last frame the same box now
open and fully unpacked on a different table; the model has no coherent path
between two disconnected states and will blur-cut through it.
