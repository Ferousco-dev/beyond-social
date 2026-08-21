---
id: depth-and-layering-cast-shadow-cross-plane
title: Let a shadow cross from one plane onto another
category: cinematography
subcategory: lighting
tags: [shadow, lighting, depth, blocking]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A shadow that falls from a near object across a farther surface physically
ties the two planes together and reveals the distance between them by how
much the shadow stretches and softens, information a flat, shadowless render
simply omits.

- Name the light source's direction and height so the shadow's length and
  angle are implied: "low side sun casts a long shadow of the railing across
  the floor toward the subject."
- Let a foreground object's shadow fall onto a midground surface, a person's
  shadow crossing a table, a tree's shadow reaching a wall, rather than
  confining shadows to their own object's base.
- Soften shadow edges in proportion to the light source's implied size and
  the distance traveled: hard, crisp shadows from a small hard source, direct
  sun, a bare bulb; soft, diffused edges from a large source, overcast sky,
  a softbox, bounced light.
- Keep shadow direction consistent with every other light cue in the prompt,
  rim light, window light, so the render doesn't contradict itself.

Why: shadow length and softness are a direct geometric readout of light
angle and surface distance, tools cinematographers use to sell scale, since
a long raking shadow implies a large space. Omitting shadows or leaving them
vague forces the model to default to soft ambient occlusion with no
directional logic, a common flatness tell.

Example: "low afternoon sun casts the fence's long shadow stripes across the
yard, reaching and crossing over the dog lying in the midground."

Counter-example: "subject and objects in the scene, no shadows specified"
will likely default to flat, directionless ambient shading with no
ground-plane connection between layers.
