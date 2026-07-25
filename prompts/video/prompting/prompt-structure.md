---
id: video-prompt-structure
title: Anatomy of a video generation prompt
category: video-prompting
tags: [prompt, structure, subject, action, camera, lighting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.95
---

A strong text-to-video prompt is ordered, not a pile of adjectives. Describe six
things, in roughly this order, and the model has everything it needs to stage a
shot: **subject, action, setting, camera, lighting, style/mood.**

- Subject: who or what, with the two or three visual details that matter (age,
  wardrobe, material, color). Not every detail, the load-bearing ones.
- Action: one clear thing happening. Video is time; give it a verb.
- Setting: where, and the time of day or weather that sets the light.
- Camera: shot size and any movement (see the cinematography and camera chunks).
- Lighting: source, direction, quality (soft/hard), color temperature.
- Style/mood: the look (cinematic, documentary, anime) and the feeling.

Why this order: models weight earlier tokens more heavily, so leading with the
subject and its action anchors the generation before modifiers refine it. Bundling
everything into one run-on sentence makes the model average competing cues and
produces mush.

Example: "A barista in a linen apron pours steamed milk into a latte, close-up on
the cup, slow overhead tilt down, warm morning light from a window camera-left,
shallow depth of field, cinematic, calm." Counter-example: "amazing beautiful
professional high quality coffee video, 4k, trending, stunning" (no subject, no
action, no shot, all empty modifiers).
