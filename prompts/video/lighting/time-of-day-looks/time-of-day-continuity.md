---
id: time-of-day-looks-continuity
title: Time-of-day continuity across a sequence
category: lighting
subcategory: continuity
tags: [continuity, golden-hour, blue-hour, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Because time-of-day light changes fast and directionally, a sequence of shots
meant to be the same scene must share a single, consistent sun position and
light-value trajectory. Mismatched shadow direction or light level between cuts
is one of the fastest ways a generated sequence reads as synthetic.

The recipe:

- Lock shadow direction across every shot in a scene: if the sun is camera-left
  in shot one, it stays camera-left, accounting for the character's turns, in
  every following shot of that scene.
- Treat golden hour and blue hour as fast-moving; light measurably drops within
  minutes, so a sequence meant to span "a few minutes" should show a slight,
  consistent darkening or warming trend across cuts, not static repeated
  lighting.
- If a scene must run longer than the real light window allows, a multi-minute
  dialogue during "golden hour," state that explicitly and accept gradual
  dimming across the sequence; a frozen light state looks like a static render,
  not shot footage.
- Keep reflections, cast shadows, and eye catchlight position all agreeing with
  the same single light-source direction; a common tell is a correct rim light
  on hair paired with a catchlight positioned for a different angle.
- Hold color temperature identical across wide and close cuts unless a
  practical source justifies the shift, moving from open sky to under an
  awning, for instance.

Why: real footage is bound by one physical sun that can only be in one place, so
any inconsistency in shadow direction, light level, or color temperature between
shots meant to read as continuous is a direct, verifiable contradiction the eye
catches even when it can't name the mechanism.

Example: "scene: sunset, sun low camera-right throughout; shot one wide
establishing, shot two close-up keeps shadows falling the same direction and
light two shades dimmer than shot one."

Counter-example: a golden-hour dialogue scene where the shot/reverse-shot cuts
show the sun apparently on opposite sides of each character's face, physically
impossible for two people facing each other under one sun.
