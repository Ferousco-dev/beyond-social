---
id: troubleshooting-common-failures-weightless-movement-lacking-contact
title: "Symptom: bodies and objects move as if weightless"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [physics, weight, motion, contact, grounding]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Symptom: a person sits down without the chair taking their weight, a foot
lands without a heel strike or a slight give in the step, a dropped object
doesn't quite settle, or fabric moves without any sense of gravity pulling on
it. Nothing is technically "wrong" in any single frame, but the motion reads
as floaty and unmotivated because it skips the physical consequences of mass.

- Name the contact moment, not just the action: "she sits, the cushion
  compresses slightly under her weight" or "he sets the cup down, it settles
  with a small wobble" gives the model an event to render, not just a
  position change.
- Add a settle beat after any stop: real motion overshoots slightly and
  corrects (a bag swings once and damps out after someone stops walking); a
  motion that simply halts at its endpoint is the giveaway of unweighted
  animation.
- For footsteps and weight-bearing motion, reference the specific mechanic:
  "heel strikes first, weight rolls forward" reads as grounded in a way
  "walks toward camera" alone does not.
- Keep gravity-affected elements (hair, loose fabric, liquid, hanging straps)
  doing one simple thing so their weighted behavior is legible rather than
  competing with a busy action for the model's attention.
- Slower, more deliberate actions give weight more room to read; a fast
  action compresses the window where contact and settle would be visible, so
  when weight matters, slow the pace down.

Why: mass and gravity show up as specific, learnable secondary motion —
compression on contact, overshoot and settle, weight transfer through a
step — and naming those beats is what separates "an object moved" from "an
object with mass moved," which is the entire difference between animation
and footage.

Example: "he sets his coffee down on the counter, it settles with a small
wobble before going still."
Counter-example: "he puts his coffee down" with no contact or settle
described, defaulting to an object that stops instantly with no weight.
