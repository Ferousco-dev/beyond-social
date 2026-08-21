---
id: subject-consistency-descriptions-face-structure-vocabulary
title: Bone-structure vocabulary instead of attractiveness adjectives
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, portrait, character-description, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Durable facial identity comes from bone-structure and proportion language, the
vocabulary a portrait photographer or caricaturist would use, not from
attractiveness adjectives.

- Describe jaw shape (square, tapered, rounded), cheekbone prominence, brow
  ridge, and nose bridge shape (straight, slight bump, slightly upturned).
- Note interocular spacing (close-set, wide-set) and eyelid type (hooded,
  monolid, deep-set) — these read as identity even in a wide shot or at a
  glance.
- Avoid subjective quality words entirely — handsome, striking, elegant,
  gorgeous — because they carry no reproducible geometric information.
- Pair structure words with a named imperfection from elsewhere in the identity
  block rather than treating structure description as a substitute for it.

Why: portrait artists rely on bone structure to achieve a likeness because it is
the load-bearing geometry of a face — skin, expression, and lighting change
constantly, but the underlying structure doesn't, which makes it the single most
stable thing a text description can lock down across regenerations.

Example: "a tapered jaw, high flat cheekbones, a straight nose bridge with a
slight bump, wide-set hooded eyes."

Counter-example: "a striking, handsome face" — supplies zero structural
information, so the model invents new bone structure on every regeneration even
though the words describing it never change.
