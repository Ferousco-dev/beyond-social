---
id: troubleshooting-common-failures-reflections-and-glass-breaking-scene-logic
title: "Symptom: mirrors, glass, and reflections don't match the scene"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [reflections, mirrors, glass, physics]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

Symptom: a mirror, window, phone screen, or polished surface shows a
reflection that doesn't match what should logically appear there, an empty
mirror in front of a visible subject, a reflection facing the wrong way, or a
window reflecting a room that doesn't match the one in frame. Reflective
surfaces require the model to render a second, geometrically-consistent
version of the scene, and that's a much harder constraint than it looks.

- Avoid mirrors and large reflective surfaces as a frame element unless the
  reflection itself is the point of the shot; a plain wall or matte surface
  behind a subject removes an entire class of failure with no cost to most
  shots.
- If a reflective surface must be in frame, keep it out of focus or at a
  steep enough angle that it reflects only soft, ambiguous light and color
  rather than a legible second image the eye can compare against reality.
- For product shots that rely on reflection for premium feel (a glossy
  phone screen, a polished countertop), treat the reflection as abstract
  highlight and gradient rather than a literal mirrored scene: "soft
  reflected highlights sweeping across the glossy surface" instead of
  implying a full mirrored duplicate of the room.
- When a reflection genuinely needs to show the subject (a mirror
  check-yourself beat), keep the shot short and the reflection partial or
  angled, rather than a full frontal shot where any mismatch is immediately
  checkable.
- Treat specular reflections on curved metal or water the same way: keep
  them as movement and highlight, not a specific recognizable scene.

Why: a correct reflection requires solving for a second, consistent
viewpoint on the same 3D scene simultaneously with the primary view, a much
harder joint constraint than rendering one coherent frame; keeping
reflections abstract sidesteps a problem the model isn't equipped to solve
reliably.

Example: "polished countertop with soft reflected highlights and color, no
legible mirrored scene."
Counter-example: "close-up on a large mirror clearly reflecting the subject
and the room behind the camera" — a direct request for a hard geometric
consistency problem.
