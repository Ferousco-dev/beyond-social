---
id: model-veo3-material-strengths-weaknesses
title: Lean on fluid motion; avoid fine mechanical interaction
category: video-prompting
tags: [physics, materials, strengths-weaknesses, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Veo 3's physical simulation is uneven by material and interaction type. Soft,
continuous, fluid-driven motion renders convincingly, while precise
multi-object mechanical interaction and dense, independently moving crowds
are where it breaks down.

Practice:

- Lean into what renders well: liquids pouring or rippling, fabric and hair
  moving in wind, smoke and steam dispersing, fire flickering, dust motes
  drifting in light. These are continuous, physics-driven motions the model
  handles convincingly.
- Avoid precise multi-step hand-object manipulation in one shot: tying a
  shoelace, threading a needle, shuffling a deck of cards. Fine sequential
  finger-object contact is where morphing and extra-digit errors concentrate.
- Keep crowds and group choreography out of a single close shot. A background
  crowd rendered soft and slightly out of focus reads fine, but a foreground
  group meant to move in a coordinated, readable way (a synchronized dance, a
  handshake between two named characters) frequently glitches.
- When a scene needs a precise mechanical action (a key turning in a lock, a
  bottle cap unscrewing), favor a framing that implies the result rather than
  tracking every intermediate motion. A shot starting just before completion
  is more reliable than one demanding the full mechanical sequence.

Why: the training data has vastly more footage of continuous, loosely
constrained physical motion, fluids, cloth, particulates, than of precisely
choreographed rigid-body interactions between distinct objects and fingers.
The model has a stronger learned prior for the former and improvises badly,
visibly, on the latter.

Example: "Steam rises off a bowl of noodles as chopsticks lift a single
strand; camera close, shallow focus, background soft."
Counter-example: "two hands tying an intricate knot in fine rope while a
third person claps in sync in the background." Stacks exactly the fine
manual dexterity and multi-person coordination the model handles least
reliably.
