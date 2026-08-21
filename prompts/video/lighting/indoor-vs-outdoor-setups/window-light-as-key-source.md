---
id: indoor-vs-outdoor-setups-window-light-as-key-source
title: Window light behaves as a single soft source with falloff
category: lighting
subcategory: indoor-vs-outdoor-setups
tags: [indoor, window-light, falloff, key-light]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ugc, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Indoor natural light is functionally one soft key source with real falloff, unlike
the sun outdoors, which barely dims across a room. Name the distance and window
size, not just "near a window."

- Distance drives brightness: a subject 1m from a window reads bright and
  contrasty; the same subject 3m back reads flat and noticeably dimmer. State the
  distance.
- Falloff shows across the face too: the near side toward the window can be a
  stop or two brighter than the far side. Say "light wraps and falls off across
  the face," not "even light."
- Source size sets shadow edge: a large, close window gives a soft wrap; a small,
  distant window gives a harder edge. Name the window type (floor-to-ceiling,
  single pane, frosted).
- Direction is fixed by the window frame: facing it is flat frontal, standing
  beside it gives 90-degree side modeling, back to it gives silhouette or rim
  only.

Why: the model has deep priors on physically-motivated single-source falloff from
photography, so naming distance and source size lets it render real directional
shaping instead of defaulting to uniform, bounce-flash-style fill that ignores the
room.

Example: "seated one meter from a large uncovered window, light falls off sharply
across the room, near cheek bright, far side of the face in soft shadow."
Counter-example: "well-lit room with light from the window" — no distance or size
given, so the model fills the room evenly instead of shaping it.
