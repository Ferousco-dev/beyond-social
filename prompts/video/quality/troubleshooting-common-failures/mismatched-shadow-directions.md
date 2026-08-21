---
id: troubleshooting-common-failures-mismatched-shadow-directions
title: "Symptom: shadows fall in directions that contradict the light source"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [lighting, shadows, physics, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Symptom: a subject's cast shadow points a different way than the visible key
light implies, or two objects in the same frame throw shadows in inconsistent
directions. Viewers may not consciously clock "the physics is wrong," but the
scene reads as fake because it violates a single-light-source logic every eye
has learned since infancy.

- Name one dominant light source and its direction explicitly: "hard
  sunlight from camera-right, low angle" gives the model a single physical
  anchor for every shadow in the frame, rather than leaving it to reconcile
  several plausible lighting setups on its own.
- Avoid stacking multiple unrelated light descriptors ("warm sunset light,
  cool blue rim, soft front fill, dramatic side shadow") in one prompt; each
  added source is another shadow direction the model has to reconcile, and
  contradictions compound.
- For products or objects that must sit convincingly in a scene, add a
  grounding clause: "a soft contact shadow directly beneath the object,
  matching the key light's angle" — this is the detail that most often goes
  missing and is the first thing a trained eye checks.
- When compositing a subject into an environment (image references, plates),
  match the environment's implied light direction in the prompt rather than
  defaulting to a generic front-lit description; check the plate for where
  its own shadows fall first.
- If a shot came out with conflicting shadows, the fix is almost always to
  simplify the lighting description to one clear source rather than add more
  qualifiers.

Why: human vision infers a single light source by default (the same
assumption that makes shape-from-shading illusions work); one incoherent
shadow is enough to flag a scene as composited or synthetic, even to a
casual viewer who can't articulate why.

Example: "single hard key light from upper camera-left, subject's shadow
falls down and to the right, soft contact shadow beneath their feet."
Counter-example: "moody dramatic lighting" with no named source, direction,
or shadow behavior specified.
