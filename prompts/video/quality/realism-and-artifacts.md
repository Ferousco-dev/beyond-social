---
id: quality-realism-artifacts
title: Avoiding artifacts in generated video
category: video-quality
tags: [artifacts, realism, morphing, quality]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.92
---

Generated video has characteristic failure modes. Most are avoidable by prompting
for what the model does well and steering away from what it does poorly.

Common artifacts and how to reduce them:

- Morphing / warping (faces, logos, geometry): reduce competing detail, slow the
  camera and the action, and pin identity ("keep the shape and text exact").
- Extra or fused fingers and limbs: avoid complex hand actions in frame; favor
  wider framing or hands doing one simple thing.
- Flicker and texture crawl: prefer simpler backgrounds and steadier light; busy,
  high-frequency detail crawls.
- Physics breaks (liquids, cloth, crowds): keep such motion slow and singular;
  fast or multiple simultaneous complex dynamics are where it falls apart.
- Uncanny motion: subtle, natural movement beats big, fast gestures.

The meta-rule: complexity and speed multiply artifacts. Slow, simple, single-action
shots with clean backgrounds and motivated light are the reliable path to
clean output; assemble many such shots rather than asking one shot to do too much.

Why: knowing the model's limits lets you compose within them and ship clean footage
instead of fighting glitches after the fact.

Example: "slow push-in, single subject, clean background, one simple action."
Counter-example: "fast crowd scene, many hands gesturing, busy neon background,
rapid camera spin."
