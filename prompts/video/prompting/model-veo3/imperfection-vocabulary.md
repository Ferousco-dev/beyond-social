---
id: model-veo3-imperfection-vocabulary
title: Name a real capture flaw instead of asking to "look real"
category: video-prompting
tags: [realism, imperfection, grain, camera-texture]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Flawless, mechanically smooth footage is itself a tell of generated video,
because real cameras and real operators never achieve it. Naming a specific
technical imperfection gives the model a concrete physical target instead of
an abstract instruction to look authentic.

Practice:

- Name a specific capture medium and its known texture: "shot on 16mm,
  visible grain," "iPhone front camera, slightly soft, mild compression."
- Ask for one small, real operator error rather than mechanical smoothness: a
  half-second of autofocus hunting before it locks, a slight handheld sway, a
  whip pan that overshoots by a hair before settling.
- Specify shutter-driven motion blur explicitly, "motion blur consistent with
  a 180-degree shutter," instead of leaving fast motion to render as clean,
  blur-free steps, a common tell of synthetic video.
- Add one lens-specific imperfection when it fits: slight barrel distortion
  on a wide lens, a soft flare when a light source clips the edge of frame,
  mild chromatic fringing at high-contrast edges.

Why: naming the specific technical texture of an actual capture format, or a
specific human imperfection, gives the model a concrete physical target that
happens to be the thing separating real footage from synthetic footage. "Look
real" has no such target, so the model falls back on its default, which
trends toward an unnaturally clean image.

Example: "Shot handheld on what reads like a 16mm film camera, visible grain,
a slight focus pull that lags half a second behind the subject stepping into
frame."
Counter-example: "ultra realistic, hyper detailed, photorealistic 8k."
Abstract quality words with no physical imperfection specified, which tends
to produce the opposite: an overly clean, synthetic-looking image.
