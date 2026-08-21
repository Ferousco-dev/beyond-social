---
id: lenses-and-focal-length-aperture-depth-of-field
title: Aperture and depth of field as a control vocabulary
category: cinematography
subcategory: lenses-and-focal-length
tags: [aperture, depth-of-field, bokeh, f-stop]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Naming an f-stop is a more reliable way to get a specific depth-of-field look than
describing blur qualitatively, because f-numbers map to a learned range of real
lens behavior rather than a vague adjective.

- f/1.4-f/2: very shallow, only a thin slice in focus, used for isolating a face
  or product logo while everything else dissolves into soft shapes.
- f/2.8-f/4: shallow but forgiving, keeps most of a face or product in focus while
  the background still separates and softens.
- f/8-f/11: near-uniform sharpness front to back, used for wide establishing shots
  where the environment itself is the subject.
- Pair the f-stop with a focal length ("50mm at f/1.8") since the same aperture
  produces different bokeh character on a wide lens versus a telephoto lens.
- Specify what stays sharp, not just what blurs: "subject's eyes and the product
  label in focus, background reduced to soft color blocks."

Why: depth of field is the single strongest visual cue for "this was shot with a
real lens," because it encodes an optical constraint (focal plane, circle of
confusion) that AI-generated video without this vocabulary tends to skip,
producing an artificial edge-to-edge crispness that reads as synthetic.

Example: "35mm lens at f/2, subject's face sharp, kitchen counter and window
light behind them soft and rounded into out-of-focus shapes."
Counter-example: "blurry background" alone gives no aperture or focal-length
anchor, so the model may default to a flat, evenly-sharp frame with a cheap
vignette-style blur instead of true optical falloff.
