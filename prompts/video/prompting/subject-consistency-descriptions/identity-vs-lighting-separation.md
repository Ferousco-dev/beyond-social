---
id: subject-consistency-descriptions-identity-vs-lighting-separation
title: Separating identity descriptors from lighting-dependent language
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, lighting, character-description, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Fixed traits should be described independent of how any single shot happens to
light the subject, or lighting-specific words leak into the identity and cause
mismatches the moment the scene changes.

- Describe skin tone by pigment and undertone (warm olive, cool fair), not by lit
  appearance (golden, glowing).
- Describe eye color by pigment (hazel with a darker limbal ring), not by
  catchlight description (sparkling, luminous).
- Keep hair color as pigment (dark auburn); let how it looks under backlight
  live in the per-shot lighting instruction, not the identity block.
- Write the identity paragraph once, then attach a separate, shot-specific
  lighting sentence to each scene rather than folding lighting into identity.

Why: lighting language baked into an identity description only reproduces
correctly under the one lighting setup it implicitly describes. The moment a
later shot moves to different light, the model either ignores the mismatch
outright or warps the subject's actual coloring to try to satisfy both the old
lighting words and the new scene, producing a subtle but visible inconsistency.

Example: identity — "cool fair skin, hazel eyes with a darker limbal ring";
lighting, written separately per shot — "backlit by low sun, warm rim light
along the hair."

Counter-example: "glowing golden skin, sparkling eyes" baked directly into the
identity block, then reused unchanged in a shot lit by flat overcast daylight —
produces a waxy, mismatched look because the identity text is fighting the
actual light in the scene.
