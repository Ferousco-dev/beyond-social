---
id: handheld-vs-stabilized-settle-and-drift
title: Real camera moves ease and settle, they never snap
category: camera-movement
subcategory: physics
tags: [settle, drift, physics, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Real camera moves don't start or stop at constant velocity. A handheld shot
overshoots and settles when it lands on a subject, and even mechanical dolly and
slider moves ease in and out, so specifying that ramp is what separates a
directed move from a frame that simply teleports into position.

- Handheld arrival: describe the camera "finding" the subject, a slight
  overshoot past the intended frame, then a correction back that settles within
  the first half second.
- Mechanical move ease: specify "eases into the push" or "gentle ease-out at the
  end of the pan" for dolly, slider, or gimbal moves, since real motorized rigs
  ramp velocity rather than snapping to speed.
- On a hard cut into a handheld shot already in motion, keep the drift going
  from frame one; a shot that is mid-motion but perfectly stable at the cut
  point reads as artificial.
- Avoid phrases like "instantly locks onto subject" or "perfectly tracks," which
  remove the very ramp that reads as physical.

Why: constant, instantaneous velocity is a mathematical idealization no physical
rig or human arm produces. Any move description that implies it, perfect
tracking, instant lock, nudges the model toward the frictionless motion that is
one of the most common tells in generated footage.

Example: "handheld push toward the subject, slight overshoot, settles into
frame after about half a second."
Counter-example: "camera instantly and perfectly locks onto the subject's face"
— describes motion no physical operator or rig actually produces.
