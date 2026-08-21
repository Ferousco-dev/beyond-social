---
id: model-seedance-image-to-video-conditioning
title: Dividing labor between the reference image and the prompt
category: video-prompting
subcategory: model-seedance
tags: [seedance, image-to-video, first-frame, conditioning]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

In Seedance's image-to-video mode, the first-frame image locks identity,
framing, and lighting; the text prompt should describe only what changes after
frame one, not repeat what the image already shows.

The recipe:

- Let the image carry: subject appearance, wardrobe, exact framing, existing
  light sources.
- Use the prompt only for: the motion, the camera move, and anything that
  enters frame after the start.
- Don't re-describe the subject's appearance in the prompt — restating it in
  different words invites the model to drift toward the new description
  instead of the image.
- If the reference image is static or posed, give the model a clear first
  action ("then she looks up and steps forward") so it has something concrete
  to animate rather than guessing.

Why: the model treats the prompt as an instruction for change relative to the
conditioning frame. Redundant description competes with the image for
influence over identity, while a prompt that specifies only motion gives the
model a single unambiguous job to do.

Example (image: product shot of a sneaker on a table): "The camera slowly
orbits the sneaker as a hand enters frame and picks it up."

Counter-example: "A white and red sneaker on a wooden table, camera orbits" —
restating the sneaker's colors and setting from the image invites the model to
renegotiate details the photo already fixed.
