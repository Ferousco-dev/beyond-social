---
id: model-seedance-lighting-vocabulary
title: Motivated lighting language for Seedance
category: video-prompting
subcategory: model-seedance
tags: [seedance, lighting, cinematography, mood]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Seedance renders lighting most convincingly when the prompt names a physical
source the light is coming from, because that gives the model a consistent
direction and falloff to hold across the frame instead of an ambient,
sourceless glow.

The recipe:

- Name the fixture, not the mood: "single practical lamp on the desk" beats
  "moody lighting."
- Specify direction relative to the subject: "backlit by the window behind
  her," "side-lit from a lamp camera-left."
- Use time of day and its real color-temperature effects: "late-afternoon
  light, long shadows, warm cast," rather than just "golden hour" alone, which
  the model sometimes renders as an oversaturated filter instead of actual
  low-angle sun.
- Call out what stays dark: naming the shadow ("the far side of the room falls
  into shadow") stops the model from over-lighting the whole frame to
  compensate.

Why: sourced, directional lighting descriptions correspond to how footage is
actually lit and shot, so the model reproduces consistent falloff and shadow
direction from them. Unsourced mood words get mapped to a generic even wash
because the model has no physical anchor to derive direction or falloff from.

Example: "Single window camera-left throws hard side light across his face;
the rest of the room falls into soft shadow."

Counter-example: "Moody dramatic atmospheric lighting" — no source or
direction specified, so the model typically defaults to flat, ambient light
with a slight vignette rather than anything with real shadow behavior.
