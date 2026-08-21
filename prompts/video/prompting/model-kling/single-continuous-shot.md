---
id: model-kling-single-continuous-shot
title: Kling generates one continuous shot, not a sequence of cuts
category: video-prompting
subcategory: model-kling
tags: [shot-structure, continuity, editing, single-shot]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Kling was trained to extend one camera setup through time, not to assemble an
edit; a prompt describing two different shots ("close-up on her face, then cut
to the street") gets rendered as one shot that awkwardly blends both instead
of an actual cut.

- Write every prompt as a single, unbroken camera-and-action description: one
  location, one framing, one continuous move.
- If the concept needs a cut, generate two separate clips, each a single
  self-contained shot, and cut them together in the edit. Do not ask Kling to
  cut internally.
- Avoid sequencing language: "then," "next," "after that," "cuts to." These
  get partially obeyed and partially ignored, producing a warped mid-clip
  transition instead of a clean cut.
- For a push from wide to close within one clip, describe it as camera
  movement ("slow dolly in"), not as a shot change.

Why: the model's temporal attention is built around continuous motion
vectors. Asking it to jump discontinuously between two compositions forces it
to interpolate between them, and interpolation between unrelated frames is
exactly what produces the warping, ghosting look that reads as generated
rather than shot.

Example: two prompts generated separately, "static medium shot, woman at
counter, morning light" and "static wide shot, street outside cafe, morning
light," cut together in post.
Counter-example: "medium shot on woman's face, then cut to wide shot of the
street" as one Kling prompt — produces a single shot that partially zooms and
partially relocates, resembling neither composition cleanly.
