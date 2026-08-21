---
id: ambient-sound-and-foley-room-tone-baseline
title: Room tone as the sonic floor
category: audio
subcategory: ambience
tags: [room-tone, ambience, realism, silence]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.90
---

Every real space carries a continuous low-level tone, an HVAC hum, a distant
traffic rumble, a refrigerator compressor, wind through trees, that never
drops to true zero. Specify that floor explicitly instead of leaving it to
default.

- Name a tone source tied to the visible location: fluorescent hum for an
  office, fridge compressor for a kitchen, distant traffic for a street
  exterior.
- Set the tone below dialogue and foreground foley, but keep it continuous
  through cuts within the same scene.
- Let the tone drift slightly over time rather than looping identically.
- Match the tone's reflective character to the room's implied size: a small
  bathroom sounds tighter, a warehouse carries longer decay.

Why: generation models default to a near-silent bed unless prompted
otherwise, but real recordings always carry the space's own noise floor.
An audience's ear has learned that floor as proof of physical space over a
lifetime of listening, so its absence reads as a studio void even when the
picture itself looks correct.

Example: "kitchen interior, continuous soft refrigerator hum and faint
street traffic bleeding through a closed window, no clean silence between
lines."

Counter-example: "quiet kitchen scene" with no ambience specified, which
generation tools render as a dead, anechoic bed that flags the shot as
synthetic the moment dialogue pauses.
