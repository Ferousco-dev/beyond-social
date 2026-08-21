---
id: model-veo3-on-screen-text-limitations
title: Don't rely on baked-in text or logos rendering legibly
category: video-prompting
tags: [text-rendering, logos, limitations, on-screen-text]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Legible on-screen text and precise logo geometry are a known weak point.
Multi-word signage, small captions, and brand wordmarks tend to render as
approximate, warped, or invented glyphs even when the prompt specifies the
exact words.

Practice:

- Don't rely on the model for exact, readable text longer than a couple of
  short words: a one-word sign, a simple two-digit number. Anything longer
  has a high chance of garbling.
- If exact on-screen text or a logo must be legible, add it in post as a
  title or overlay rather than prompting for it to appear baked into the
  generated footage.
- When a sign or label is needed for environmental realism but doesn't need
  to be readable, describe it by function rather than exact copy: "a
  hand-lettered chalkboard menu," not the actual menu text.
- If brand identity must appear cleanly on a product, start from a reference
  image that already has the correct logo baked in (image-to-video) rather
  than describing the logo in words and hoping it renders faithfully.

Why: the model is generating pixels that resemble text based on visual
patterns learned from footage, not composing characters from a font system
the way a title generator does. It approximates letterforms the way it
approximates any other fine, high-frequency detail, and small compounding
errors read as a garbled word rather than a passable substitute.

Example: "A small chalkboard sign hangs by the door, hand-lettered text too
small to read clearly."
Counter-example: prompting for "a storefront window with the words 'GRAND
OPENING SALE, 50% OFF EVERYTHING TODAY ONLY' painted in blue script" and
expecting every letter to render correctly.
