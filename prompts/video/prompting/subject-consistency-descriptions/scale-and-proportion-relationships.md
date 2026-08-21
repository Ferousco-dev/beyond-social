---
id: subject-consistency-descriptions-scale-and-proportion-relationships
title: Anchoring product scale to a visible reference, not raw dimensions
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [product-consistency, scale, proportion, product-video]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A product's size only reads as consistent across shots when it's described
relative to a reference the camera can actually show, because absolute
dimensions typed into a prompt don't reliably constrain generated scale.

- Anchor size to something the model can render accurately from training data:
  fits in one closed hand, sits below the collarbone when held, spans four
  stacked fingers.
- Restate the same relational anchor in every shot, especially when framing
  changes from a close-up insert to a wide establishing shot.
- Avoid unitless size words alone — "small," "compact" — without a comparison
  point attached to them.
- For multi-product shots, describe sizes relative to each other ("the travel
  size is half the height of the standard bottle") so the set's proportions
  hold together across cuts.

Why: video models have no true metric sense of size, only learned visual
associations between objects and their typical scale in frame. A numeric size
claim with nothing in the shot to compare it against is not actually
constraining anything, so the same "6-inch object" can render at noticeably
different apparent sizes shot to shot.

Example: "a can that fits fully inside one closed hand, roughly the height of
four stacked fingers."

Counter-example: "a small, compact can, 120mm tall" — the numeric height has no
visual anchor in frame, so it gets ignored or misjudged, and the can's apparent
size drifts between shots.
