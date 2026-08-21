---
id: skin-tone-and-product-color-accuracy-product-hero-color-lock
title: Locking exact product color with a reference anchor
category: color-grading
subcategory: product-color
tags: [product-color, color-accuracy, brand-color, reference]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A product's brand color has to survive the generation and grading pipeline
unchanged, because a viewer who knows the real product will spot even a small
hue shift immediately, so the color needs to be locked with a literal
reference, not a verbal approximation.

- State the product color with a concrete anchor, not just an adjective: a hex
  value, Pantone reference, or a comparison to a known object ("the same red
  as a fire engine, not cherry red") rather than "vibrant red."
- Where the pipeline allows a reference image, feed the actual packaging or
  bottle as a color reference rather than describing it from memory.
- After generation, sample the product's dominant color in the frame and diff
  it against the source hex; treat drift beyond a few percent in hue or
  saturation as a failed take, not a stylistic variation.
- Keep the reference consistent across every shot of the same product in a
  spot; regrading shot-by-shot for mood should never touch the product's own
  hue, only its surrounding light.

Why: color names are ambiguous — "red" spans a wide hue range — and a
generative model has no persistent memory of the specific object across takes,
so without a hard numeric or visual anchor each generation independently
reinterprets the color, producing visible inconsistency the moment two shots
of the same product sit next to each other.

Example: "product color locked to #C41E3A, matched to reference image,
unaffected by scene color grade."

Counter-example: describing the product only as "bold red" across multiple
shots yields a different red in each one, and cutting them together makes the
product itself look like it changed.
