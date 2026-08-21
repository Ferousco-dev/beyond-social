---
id: grading-looks-and-luts-vhs-retro
title: VHS/analog-tape look versus film emulation
category: color-grading
subcategory: grading-looks-and-luts
tags: [vhs, retro, chroma-bleed, nostalgia, analog]
applicability:
  platforms: [tiktok, instagram]
  productTypes: [short-form-video, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

VHS-era grading reproduces consumer analog tape, not film — chroma bleed and
smear at high-contrast edges, low chroma resolution relative to luma, capped
red saturation, a warm overall cast. It suits nostalgia-driven and ironic
brand voice; it is a different texture family from film emulation entirely.

The recipe:

- Soften the chroma channel's effective resolution relative to luma.
- Add slight color bleed or ghosting at hard vertical edges.
- Cap red saturation — VHS famously blooms and smears reds first.
- Warm the overall white balance.
- Do not add film grain here; use chroma noise instead, it is a different degradation.

Why: VHS look comes from the physical bandwidth limits of consumer analog
tape, which recorded chroma at far lower resolution than luma. That is a
completely different degradation signature than film grain or digital sensor
noise, and mixing the two families is the detail that gives a fake retro
grade away.

Example: "VHS-era look, soft smeared red highlights, low chroma detail, warm
cast, no film grain."

Counter-example: adding 35mm film grain on top of a VHS color grade — grain
and tape chroma-bleed are physically unrelated degradations, and combining
them reads as an AI-generated pastiche rather than a real archival source.
