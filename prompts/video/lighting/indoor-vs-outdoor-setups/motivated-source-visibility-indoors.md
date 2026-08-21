---
id: indoor-vs-outdoor-setups-motivated-source-visibility-indoors
title: Every indoor light needs a plausible visible source
category: lighting
subcategory: indoor-vs-outdoor-setups
tags: [indoor, practicals, motivated-light, ai-look]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, product-video, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Indoor light should trace back to a source the camera could plausibly see; an
unmotivated indoor glow with no fixture behind it is one of the fastest tells of
generated footage.

- For every named indoor light, either put the fixture in frame (lamp, window,
  monitor, neon sign) or place it just outside frame with a stated direction:
  "light from an unseen lamp camera-left, out of shot."
- Match the light's falloff to its stated source: a desk lamp falls off hard
  within a few feet (small, close source), a ceiling fixture is broader and
  dimmer per unit area (larger, farther source), a screen glow reads cool, dim,
  and flickering only on nearby skin.
- Practicals should visibly affect their immediate surroundings, a lit lamp
  should show its own pool of light on the desk beneath it, not only illuminate
  the actor's face.
- Keep it to two or three named sources per indoor shot; beyond that the model
  tends to average them into flat, sourceless fill instead of distinct pools of
  light.

Why: indoor scenes have no default ambient fill the way outdoor scenes have
skylight, so any light not traceable to a plausible fixture reads as the generic,
directionless "everything lit evenly" signature that separates synthetic footage
from a shot lit by an actual crew.

Example: "a single desk lamp is the only light source, warm pool of light visible
on the desk itself, the far side of the room falls to near-black."
Counter-example: "cozy indoor lighting" with no named fixture, letting the model
fill the whole room evenly with no falloff, pooling, or shadow.
