---
id: model-infinitetalk-lipsync-camera-framing-talking-avatar
title: Framing and lens choice for a believable talking-head shot
category: video-prompting
subcategory: avoiding-stillness
tags: [infinitetalk, framing, lens, composition]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Framing choices that read as camera-operated, rather than centered and static,
do a lot of the work of selling a talking avatar as filmed footage instead of
a generated loop.

- Use a mild off-center composition (subject on a rule-of-thirds line, not
  dead-center) since perfectly centered, symmetric framing is a strong visual
  cue for template or AI-generated content.
- Specify a plausible lens: "35mm-equivalent, slight perspective compression"
  for a phone-style UGC read, or "50-85mm-equivalent, flatter perspective" for
  a produced brand-video look; naming a focal length gives the model a
  concrete depth and background-blur target instead of a generic portrait.
- Add a small amount of handheld or tripod imperfection ("slight natural
  frame drift" or "very subtle handheld micro-movement") rather than a
  mathematically locked frame, which is the one thing a real camera never
  quite achieves.
- Leave asymmetric headroom appropriate to gaze direction: more space on the
  side the subject's eyes drift toward reads as intentional camera operation.

Why: viewers associate perfect symmetry and a mathematically static frame with
software, because that is the cheapest thing for software to produce; a lens
choice, an off-center subject, and a trace of frame instability are all things
a physical camera and operator would introduce, and their presence reads as
evidence of a real shoot.

Example: "35mm-equivalent lens, subject on the left third, slight natural
handheld drift, headroom biased toward the gaze direction."

Counter-example: a perfectly centered, static, symmetric close-up with no
lens character specified, technically correct and immediately readable as a
generated avatar template.
