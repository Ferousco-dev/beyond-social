---
id: example-product-video-from-photo
title: Worked example, product video from a single photo
category: example
tags: [example, product, image-to-video, worked]
applicability:
  platforms: [tiktok, instagram]
  productTypes: [product-video, ad-creative]
  styles: [cinematic]
source: authored
version: 1
priorQuality: 0.92
---

The transformation from a thin brief to a directed shot, shown end to end. The
value is in the middle step: deciding the shot before writing the prompt.

## Brief

"Here's a photo of our matte black water bottle. Make something for Instagram."

## Shot plan

The photo fixes the subject, so the prompt should add motion and camera, not
re-describe the bottle. One action, one move, slow enough to render cleanly.
Matte finish reads best under a soft key with a hard rim to trace the edge.
Condensation gives motivated micro-motion without touching the product's shape.

## Generation prompt

Macro shot of the matte black bottle on wet slate, slow push-in, soft key light
from camera-left with a hard rim tracing the right edge, condensation beading and
one droplet sliding down, dark background falling to black, shallow depth of
field, cinematic, 9:16. Keep the bottle's shape, proportions, and logo exact.

## Why this works

It names shot size, movement, light direction and quality, the single action, and
the identity anchor. Nothing is left to the model's default, and nothing competes
with the subject. Compare with "nice product video of a water bottle, 4k,
professional", which specifies neither a shot nor a light and returns a generic
turntable render.
