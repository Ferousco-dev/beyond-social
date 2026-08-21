---
id: reference-image-conditioning-light-continuity
title: Routing lighting changes through a source the reference already has
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, lighting, motivated-light, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Any lighting change requested in text has to be traceable to a visible or
implied source already in the reference frame; light that changes for no
diegetic reason is one of the fastest tells that a clip is synthetic.

- Identify the reference's practical or implied source (window, overhead
  fixture, screen glow) before writing a lighting change, and route the change
  through that source: it dims, flickers, or shifts color temperature, rather
  than the whole scene relighting uniformly.
- Avoid prompting golden-hour warmth into a reference clearly lit by cool
  overhead fluorescents unless the text also accounts for a new source (curtain
  opens, someone turns on a lamp).
- Keep shadow direction consistent with the reference's existing light angle for
  at least the first portion of the clip; a shadow that flips direction with no
  camera or subject move reads as a rendering error, not a creative choice.
- If the shot needs a different mood than the reference supports, it's usually
  cheaper to pick or shoot a different reference than to fight the existing
  light with text.

Why: real light has a physical source and falls off, colors, and casts shadows
accordingly; a model asked to change the "look" of light without a source to
justify it tends to apply the change as a flat color-grade layer over the
original shading, which keeps the old shadow geometry while changing the color —
an unmistakable mismatch to a trained eye.

Example: reference lit by a single window camera-left, prompt: "clouds pass,
light dims and softens briefly, then returns," shadow direction never changes,
only intensity.

Counter-example: reference lit flat and cool from an overhead office light,
prompt "warm cinematic sunset lighting," with no window, sun, or source added to
the scene; the result is a color-graded version of the same flat light, not a
relit scene.
