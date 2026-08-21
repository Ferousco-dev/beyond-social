---
id: model-seedance-camera-vocabulary
title: Camera movement vocabulary Seedance reliably executes
category: video-prompting
subcategory: model-seedance
tags: [seedance, camera-movement, cinematography, blocking]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Seedance responds to a specific, small vocabulary of real camera-department terms
far more consistently than to vague direction like "cinematic camera move."

The recipe:

- Reliable terms: "dolly in/out," "pan left/right," "tilt up/down," "static/locked-off
  shot," "handheld," "tracking shot following [subject]," "slow zoom."
- Less reliable, use sparingly and pair with a shot length: "crane up," "orbit
  around [subject]," "whip pan."
- Never stack two conflicting moves in one sentence ("dolly in while orbiting") —
  Seedance blends them into a wobble that reads as an error, not intent.
- Name the axis, not just the verb: "pans left across the storefront," not
  "camera moves."

Why: the model was almost certainly trained on shot-labeled footage where these
terms correspond to real rig motion, so they act as motion vectors it can apply
directly to the scene. Vaguer phrasing gets mapped to the nearest generic
"cinematic" prior, which tends toward a slow, characterless push regardless of
what the scene actually calls for.

Example: "Static wide shot, locked off. A cyclist rides through frame left to
right at a steady pace."

Counter-example: "Epic dynamic cinematic camera movement" — no verb, no axis, so
the model falls back to its default slow push-in no matter what the scene needs.
