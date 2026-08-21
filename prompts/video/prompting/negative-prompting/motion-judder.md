---
id: negative-prompting-motion-judder
title: Excluding strobing motion from missing motion blur
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, motion-blur, shutter, motion]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Fast motion rendered with every frame perfectly sharp produces a stroboscopic,
judder effect, because real cameras integrate light over a shutter interval
and any motion during that interval smears. A model that renders each frame
crisp regardless of motion speed is implicitly simulating an impossibly fast
shutter, and the result reads as animation rather than footage.

What to exclude and what to specify instead:

- Exclude "tack-sharp motion, zero motion blur on fast movement, strobing
  frame-to-frame motion" as literal terms whenever the shot contains fast
  subject or camera motion.
- Specify the shutter behavior directly rather than only subtracting:
  "motion blur consistent with a standard 180-degree shutter" gives a real
  cinematography reference the model can approximate.
- Exclude this only where motion is actually fast; a static or slow shot does
  not need a motion-blur instruction and adding one can introduce unwanted
  softness to a shot that should stay crisp.
- For whip pans or fast object motion specifically, exclude "each frame
  individually sharp during the pan," since that is the precise symptom of
  the strobe artifact.

Why: shutter-driven motion blur is the single largest visual cue separating
real camera footage from rendered or stop-motion-like sequences; viewers have
an intuitive, unconscious expectation of blur trailing fast motion from a
lifetime of watching real footage, and its absence reads as wrong even when
every individual frame looks sharp and clean.

Example: "whip pan across the room, motion blur streaking the background
consistent with a 180-degree shutter, subject holds relative sharpness."
Counter-example: "crisp, sharp, high-detail fast action shot" on a whip pan or
sprint, which asks for the exact frame-by-frame sharpness that produces
strobing.
