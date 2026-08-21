---
id: subject-consistency-descriptions-fixed-identity-anchors
title: Locking identity with fixed, measurable anchor traits
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, character-description, identity, regeneration]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Identity holds across shots and regenerations only when the description locks a small
set of fixed, measurable anchors, not a general impression of the subject.

- Pick 5-7 anchors total: face shape, eye color and spacing, hairline, skin tone with
  undertone, build, and one identifying mark.
- Write each anchor as a comparable, geometric phrase rather than an adjective —
  "square jaw" and "close-set eyes," not "handsome" or "striking."
- Keep anchors independent of pose, expression, and lighting so shot-specific
  direction never contradicts the identity block.
- Repeat the exact anchor phrases verbatim in every prompt for that subject; do not
  paraphrase between shots.

Why: generative models regress toward the statistical average face or body unless
something constrains them away from it. Vague quality words carry no reproducible
geometric information, so the model fills the gap differently each time. Measurable,
comparable anchors act like control points that pull every regeneration back toward
the same result, the same way a police composite sketch works from specific features
rather than a general vibe.

Example: "a woman with a squared jaw, close-set brown eyes, a straight hairline low
on the forehead, medium olive skin with a warm undertone, average build."

Counter-example: "a beautiful, professional-looking woman in her 30s" — supplies no
geometry, so face shape, eye spacing, and proportions shift on every regeneration
even though the description technically stays the same.
