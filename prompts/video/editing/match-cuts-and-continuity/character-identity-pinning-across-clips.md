---
id: match-cuts-and-continuity-character-identity-pinning
title: Pinning character identity across separately generated clips
category: editing
subcategory: continuity
tags: [identity, character-consistency, reference-image, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, product-video, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Each generation call is an independent sample, so a "person" can subtly reroll
face shape, proportions, or skin tone between clips unless identity is deliberately
pinned rather than left to a fresh text description each time.

- Use one fixed reference image as conditioning input for every clip, not a text
  description alone.
- Lock non-negotiable anchors in text too: exact hair color, length, and part;
  eye color; one or two describable features (a mole, a scar); clothing described
  identically clip to clip.
- Regenerate a clip immediately if identity visibly drifts rather than trying to
  patch it in editing afterward.
- Keep the character in a consistent lighting category across clips; relighting a
  face from soft to harsh can itself read as a different face.
- For talking avatars, freeze the facial-structure prompt tokens verbatim between
  clips and only vary the action or line being delivered.

Why: identity drift registers as uncanny before a viewer can name why, and it is
the fastest tell of stitched AI generation, more damaging to believability than a
lighting or color mismatch because it undermines trust in the subject itself.

Example: "same reference image, 28-year-old woman, shoulder-length dark brown hair
center part, small mole above left eyebrow, cream cable-knit sweater" repeated
verbatim across every clip.
Counter-example: prompting "a woman in a sweater" fresh in each clip and hoping the
model reuses the same face. It will not, and the cut will read as two people.
