---
id: subject-consistency-descriptions-color-naming-precision
title: Qualifying color names so they reproduce the same result
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, color, product-consistency, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Color words need to be specific enough to be reproducible, because a common
color name like blue, red, or gold covers a wide range, and the model samples a
different point in that range on every generation.

- Pair a base hue with a qualifier that narrows the range: "dusty sage green,"
  not "green"; "brick red," not "red."
- When precision matters, reference a known real-world comparison: "the deep
  red of a ripe cherry," "the matte black of a chalkboard."
- Keep the color description separate from the lighting description so a shift
  in scene light doesn't get misread by the model as an instruction to change
  the actual color.
- For products in particular, restate the exact same color phrase in every
  shot; don't rotate through near-synonyms for variety.

Why: a word like "blue" spans everything from cyan to navy in training data, so
without a qualifier the model is effectively choosing at random within that
range each time it generates — which is exactly what breaks visual continuity
between two shots of what's supposed to be the same object.

Example: "a dusty sage-green canvas jacket," used identically in every shot of
the sequence.

Counter-example: shot one says "blue jacket," shot four says "navy jacket" —
close enough that it reads like careless wording, but different enough on
screen to look like a different garment entirely.
