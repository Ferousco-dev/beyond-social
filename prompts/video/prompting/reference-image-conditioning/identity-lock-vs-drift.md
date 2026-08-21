---
id: reference-image-conditioning-identity-lock-vs-drift
title: Preventing identity drift in faces, logos, and products
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, identity-preservation, face-consistency, product-fidelity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

The single hardest failure mode in reference-conditioned video is identity
drift: a face, logo, or product that subtly reshapes itself over the course of
the clip. It's controllable mainly by what you choose not to ask the model to do
near the identity-bearing region.

- Keep the identity-bearing area (face, logo, packaging) out of the path of
  large motion or occlusion; if a hand or hair crosses the face repeatedly,
  drift compounds every time it's re-revealed.
- Prefer static or near-static framing on the identity element while motion
  happens elsewhere in the shot (background, secondary subject, camera drift)
  rather than moving the identity element itself through the frame.
- Explicitly pin unchangeable attributes in text: "keep facial proportions and
  features exactly as shown, do not alter."
- Shorter clips drift less; if a longer duration is required, consider
  generating in two shorter reference-conditioned segments and cutting between
  them rather than one long single take.

Why: each generated frame is conditioned partly on the previous generated
frame, not only the original reference, so small deviations compound frame over
frame like a copy of a copy; anything that repeatedly re-derives the identity
region (occlusion and reveal, extreme angle change) gives drift more
opportunities to accumulate before the clip ends.

Example: face reference stays in a consistent three-quarter profile, camera
does a slow environmental pan rather than orbiting the subject, text: "subject's
face and expression remain as shown, environment reveals around them."

Counter-example: prompting a full 180-degree orbit around a face reference in
one continuous shot; the model has to reconstruct the far side of the face from
nothing and commonly returns a subtly different person by the time the camera
completes the arc.
