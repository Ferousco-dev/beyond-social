---
id: skin-tone-and-product-color-accuracy-metamerism-mismatch
title: Metamerism and the camera-to-monitor color mismatch
category: color-grading
subcategory: product-color
tags: [metamerism, color-accuracy, product-color, calibration]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Two colors that match under one light source can look completely different
under another — metamerism — so a product and its reference need to be
checked under the same described light as the shot, not assumed to match
universally the way a hex code implies.

- When specifying product color, also specify the light it's being viewed
  under; a hex value alone doesn't survive a shift from daylight to tungsten
  or LED.
- Watch for the classic failure: a product that reads correctly under the key
  light shifts hue when it moves into a colored practical or shadow area in
  the same shot.
- If a reference photo of the real product exists, note what light it was shot
  under so the generation can match under equivalent conditions, not just
  match pixel values blind.
- Cross-check the final render's product color against the reference under a
  neutral viewing condition, not on an uncalibrated preview.

Why: color is not a fixed property of an object but a function of the
object's reflectance spectrum interacting with the light spectrum and the
sensor's response, so two colors that match under one spectral condition can
diverge under another — which is why "it matched on my screen" often doesn't
survive a different display or a different scene light.

Example: "product color verified to match reference photo under matching
daylight-balanced light, re-checked under the scene's practical tungsten
source."

Counter-example: locking a product to a hex value and assuming it will look
correct in every lighting scenario in the video, then finding it reads orange
under the tungsten-lit second half of the spot.
