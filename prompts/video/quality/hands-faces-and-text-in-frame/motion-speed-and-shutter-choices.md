---
id: hands-faces-and-text-in-frame-motion-speed-and-shutter-choices
title: Slowing motion and naming shutter to mask instability
category: video-quality
tags: [motion, shutter-angle, motion-blur, artifacts]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A camera crew controls motion blur with shutter angle to hide fast action they
can't otherwise stabilize; the same vocabulary works in a generation prompt to
mask frame-to-frame instability in hands, faces, and any fine detail, because
blur that looks motivated reads as a camera choice, not a defect.

How to apply it:

- Slow the literal speed of any hand action, head turn, or object movement in the
  prompt; a slower action gives the model more frames per unit of motion, which
  directly reduces warping and morphing.
- Name a shutter or motion-blur quality explicitly: "cinematic 180-degree shutter,
  natural motion blur on fast movement" gives the renderer a reason to soften
  fast-moving detail instead of trying to render it crisply and failing.
- Reserve fully crisp, no-blur motion for slow or static beats only; ask for
  blur specifically on any beat with hand or head movement above a gentle pace.
- Combine slowed motion with a locked or slow, deliberate camera move (rather
  than a fast pan or shake) since compounding camera motion with subject motion
  is what most often causes hands and faces to smear or duplicate.
- On any beat that's purely a transition or connective moment, lean into motion
  blur and let the shot go soft; the eye only needs it to bridge two clean holds,
  not resolve fully.

Why: motion blur is the physically correct rendering of fast movement captured by
a real shutter, so specifying it doesn't fake anything, it gives the model a
plausible, physically motivated reason for reduced detail on the exact regions
that are hardest to keep temporally consistent.

Example: "hand movement slowed to a deliberate, unhurried pace, natural motion
blur on any fast motion, camera holds steady."
Counter-example: "fast, snappy hand gesture, everything crisp and sharp, whip-pan
camera" — removes every tool that could mask instability and asks for the hardest
possible combination of speed and clarity at once.
