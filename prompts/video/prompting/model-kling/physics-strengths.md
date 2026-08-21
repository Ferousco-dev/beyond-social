---
id: model-kling-physics-strengths
title: Where Kling's physics simulation actually wins
category: video-prompting
subcategory: model-kling
tags: [physics, motion-fidelity, fluid-dynamics, cloth-simulation]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Kling's strongest, most consistent output is large-mass secondary motion with
continuous physical behavior: fluids, fabric, hair, smoke, and fire read as
physically coherent for longer than most competing models before drifting.

- Lean into prompts that give the physics something to do: pouring liquid,
  wind moving hair or a curtain, steam rising, fabric settling after someone
  sits down.
- Describe the physical cause, not just the effect. "Curtain billows because a
  window is open" reads as more coherent than "curtain moves dramatically,"
  because the model has a learned association between the cause and the
  resulting motion pattern.
- Keep the driving force constant through the clip, steady wind, continuous
  pour, rather than changing it mid-shot. Physics-sim quality degrades when
  the underlying force starts, stops, and restarts.
- Use this strength to disguise weaker areas: a beauty shot on hair or fabric
  motion draws the eye away from a static or slightly imperfect background.

Why: the training data richest in physically continuous, high-motion clips,
fluids, textiles, fire, gives the model a denser learned prior for those
categories, so it extrapolates them more reliably than it does discrete
rigid-body actions like a handshake or a hand picking up a cup.

Example: "long hair moves in a steady crosswind, fabric of her jacket
ripples, camera holds static."
Counter-example: "hair blows wildly for two seconds then suddenly falls flat
and still" — an abrupt force change mid-clip, which the physics prior doesn't
handle cleanly and often resolves as a visible glitch.
