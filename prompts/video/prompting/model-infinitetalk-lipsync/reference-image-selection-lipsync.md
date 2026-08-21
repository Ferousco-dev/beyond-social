---
id: model-infinitetalk-lipsync-reference-image-selection
title: What makes a source photo animate well for lip-sync
category: video-prompting
subcategory: avoiding-stillness
tags: [infinitetalk, reference-image, source-photo, lipsync]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The reference still constrains everything the model can do; a bad starting
frame caps sync quality no matter how good the driving audio and prompt are.
The best source photos look like a paused video frame, not a posed portrait.

- Pick a neutral, closed-mouth, relaxed expression as the starting frame; an
  open-mouth smile or mid-word photo forces the model to fight its own
  reference to reach other mouth shapes.
- Choose even, soft, directional light with a visible catchlight in the eyes;
  flat front-lit or harsh top-lit references make it harder for the model to
  render believable shading changes as the head moves.
- Avoid extreme angles (strong three-quarter or profile); a near-frontal or
  slight three-quarter reference gives the model the most room to add small
  head turns in either direction without inventing occluded geometry.
- Confirm the reference resolution around the face is sharp; any source blur
  gets baked into every generated frame and reads as a soft-focus filter over
  the entire clip.
- Avoid heavy retouching or beauty filters on the source; over-smoothed skin
  removes the fine texture the model needs to render convincing micro-motion.

Why: the model animates from and returns to the reference's identity and
lighting logic on every frame, so any constraint baked into that single photo
(a locked smile, flat light, extreme angle) becomes a constraint on the entire
generated performance.

Example: "near-frontal reference, relaxed closed mouth, soft window light with
a visible catchlight, sharp focus on the face."

Counter-example: an open, toothy-grin selfie shot under harsh overhead light,
the model has to fight the reference just to close the mouth for a B or M
sound.
