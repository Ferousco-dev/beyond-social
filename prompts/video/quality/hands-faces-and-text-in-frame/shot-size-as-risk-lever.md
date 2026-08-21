---
id: hands-faces-and-text-in-frame-shot-size-as-risk-lever
title: Using shot size to control failure risk
category: video-quality
tags: [shot-size, composition, framing, risk]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Shot size is the fastest lever for trading detail against risk: a wide shot
generates less resolvable detail per subject and hides more, while a close-up
demands the model be right about exactly the features, hands, mouth, skin, that
fail most, so choose shot size deliberately against what's in frame.

How to use it:

- Match shot size to what the shot needs to prove: a product beauty shot earns a
  close-up because the product surface is reliable; a scene with hands and a
  face together is safer as a medium or wide shot where neither has to resolve
  at full detail.
- Escalate shot size gradually across a sequence rather than opening tight:
  start wide or medium, and cut to a close-up only once the concept has already
  read, so an artifact there isn't the audience's first impression.
- Reserve true close-ups (face filling most of frame) for shots with minimal
  motion and held mouth position, since close range gives artifacts nowhere to
  hide and the model the least room for frame-to-frame drift.
- When a script needs both a hand action and clear facial performance in the
  same beat, choose a shot size wide enough to include both at moderate detail
  rather than one tight enough to demand full fidelity on either.
- Treat extreme close-ups (eyes only, hand detail only) as the highest-risk shot
  size and reserve them for elements you've already validated render cleanly at
  that scale.

Why: resolvable detail is a budget the model spends across everything in frame;
a wide shot spends it thinly across a scene where small errors blend into the
background, while a close-up spends it entirely on the one thing most likely to
break, which is why the same subject can look clean wide and fall apart tight.

Example: "medium shot including hand and face at moderate detail, cutting to a
static close-up only once the subject is at rest."
Counter-example: "open the video on an extreme close-up of a hand pouring liquid
next to a face in profile" — puts the two riskiest elements in the highest-risk
shot size as the very first thing the audience sees.
