---
id: subject-consistency-descriptions-product-geometry-lock
title: Locking product proportions and label text
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [product-consistency, geometry, typography, product-video]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Exact proportions and label text have to be spelled out explicitly, because
generative models silently redraw geometry and typography between generations
even when the rest of a product description stays constant.

- State proportion relationships in plain comparative language: the cap is
  one-third the total height, the label wraps two-thirds of the way around.
- Spell out any visible text exactly, in quotation marks, including case and
  line breaks, rather than describing it as "a label" or "branding."
- Note fixed geometric features that are easy to lose: number of ridges on a
  cap, sharp versus rounded corners, the location of a visible seam.
- Reuse the identical geometry sentence unchanged across every prompt in the
  sequence, the same as the wardrobe or material description.

Why: text and proportion are the fastest way a viewer clocks fake product
footage. A logo that gains a letter, a cap that changes height relative to the
bottle, or a label that shifts position breaks trust in a single frame, even if
every other part of the shot looks convincing.

Example: "a tall glass bottle, cap height one-third of the total height, label
wraps two-thirds around, text reads \"NORTH FIELD\" in three lines of small caps."

Counter-example: "a bottle with a nice label" — leaves text content, proportion,
and placement fully open, so the logo and cap-to-body ratio come out different on
every render.
