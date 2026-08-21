---
id: model-seedance-aspect-ratio-framing
title: Choosing aspect ratio before writing the shot, not after
category: video-prompting
subcategory: model-seedance
tags: [seedance, aspect-ratio, composition, framing]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Seedance generates natively in the aspect ratio requested rather than cropping a
fixed frame afterward, so the composition described has to be written for that
ratio or the model improvises a recomposition that feels wrong for the shot.

The recipe:

- 9:16 (TikTok, Reels, Shorts): describe vertical staging explicitly — subject
  centered or in the lower two-thirds, headroom called out, background kept
  simple since there is little width to fill.
- 1:1: works best for a single centered subject against a symmetrical
  background; avoid describing wide environmental context that has nowhere to go.
- 16:9: the only ratio where side-by-side blocking (two people, foreground and
  background layering) can be requested without the model compressing them.
- If a deliverable needs both 9:16 and 16:9, write two separately re-blocked
  prompts rather than reusing one — a wide-shot prompt forced into 9:16 produces
  an oddly cropped, empty-feeling frame.

Why: the model composes the scene to fill the canvas it is given in a single
pass, with no separate recompose step, so a prompt written with horizontal
blocking in mind gets awkwardly stacked or shrunk into a vertical canvas instead
of genuinely rethought for it.

Example (9:16): "Vertical frame, subject centered from waist up, plain wall
behind her, phone held at chest height as if filmed by a friend."

Counter-example: reusing a 16:9 prompt describing "two people at opposite ends
of a long table" for a 9:16 render — the model squeezes both into a narrow
column with dead space above and below.
