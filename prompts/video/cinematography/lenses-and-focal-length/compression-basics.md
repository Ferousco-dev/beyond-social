---
id: lenses-and-focal-length-compression-basics
title: Wide vs telephoto compression as prompting vocabulary
category: cinematography
subcategory: lenses-and-focal-length
tags: [focal-length, compression, wide-angle, telephoto]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Focal length is a spatial-relationship control, not a zoom level: wide lenses expand
the distance between foreground and background, telephoto lenses compress it. Naming
a focal length in a prompt is a shorthand for how much depth separation the shot should
read as having.

- Under 24mm: exaggerated depth, foreground objects loom large relative to background,
  used for establishing shots and dynamic close proximity.
- 35-50mm: roughly matches natural human perception, the default "normal" look for
  dialogue and product-in-hand shots.
- 85mm and above: background elements appear stacked closer to the subject than they
  actually are, flattening the scene and isolating the subject from clutter.
- Name the focal length explicitly ("85mm telephoto compression") rather than saying
  "zoomed in," which describes framing, not the compression relationship.

Why: the model has learned focal-length terms from real photography and cinema
data, so naming a specific lens number pulls in the correct depth-compression
behavior, whereas framing words like "close-up" only control how much of the
subject fills the frame, leaving depth relationships ambiguous or default-flat.

Example: "85mm telephoto compression, subject in sharp focus, city lights
stacked tightly behind them."
Counter-example: "zoomed in on the subject with a busy background" — this
specifies framing but not compression, so the model may render the background
with wide-angle depth separation that contradicts the intended tight, layered look.
