---
id: ambient-sound-and-foley-hard-soft-foley
title: Separate hard foley from soft foley
category: audio
subcategory: foley
tags: [foley, terminology, hard-effects, ambience]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Distinguish hard foley, discrete sounds synced to a specific visible
action, from soft foley, continuous ambient-adjacent texture not tied to
one moment, and specify both separately rather than lumping everything
into one ambience tag.

- Hard foley: footsteps, a door latch, a cup set down, a zipper, each one
  frame-specific and discrete.
- Soft foley: cloth movement, breathing, general room presence, wind
  through hair, continuous and not pegged to a single frame.
- Prompt hard foley with the specific action and moment; prompt soft
  foley as a texture running under the whole shot.
- Do not let one category substitute for the other: only hard hits with
  no soft bed feels sparse and edited, only soft ambience with no hard
  hits feels muffled and inert.

Why: professional foley artists separate these categories deliberately
because they are built and mixed differently. Prompting them as one
undifferentiated "sound" blob is why generated audio often either drops
discrete action sounds entirely or renders everything as one flat texture
with no punctuation.

Example: "soft bed: room hum and faint fabric movement throughout; hard
hits: a single sharp footstep on the hardwood as she steps into frame, a
distinct door latch click as it closes behind her."

Counter-example: "add ambient sound to the scene" as the only audio
direction, leaving the model to guess whether any specific action needs
its own discrete, synced sound.
