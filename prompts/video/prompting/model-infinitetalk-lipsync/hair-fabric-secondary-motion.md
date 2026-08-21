---
id: model-infinitetalk-lipsync-hair-fabric-secondary-motion
title: Hair and fabric drift as proof the avatar isn't a cutout
category: video-prompting
subcategory: avoiding-stillness
tags: [infinitetalk, hair, fabric, secondary-motion]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Secondary motion, hair strands settling after a head turn, a collar shifting
with the shoulders, is physics that trails the primary motion rather than
matching it exactly. When hair and clothing move in perfect lockstep with the
head, or don't move at all, the figure reads as a rigid cutout with an
animated face pasted on top.

- Choose a reference with hair loose enough to carry visible motion (not
  slicked back or fully bound) if secondary motion matters for the shot; a
  tightly controlled hairstyle gives the model nothing to animate.
- Prompt for lag explicitly: "hair settles slightly after head movement" asks
  for trailing physics rather than motion glued to the skull.
- Choose fabric with some drape in the reference, a soft knit or woven collar,
  over a stiff, high-structure garment that has no give to show.
- Keep the described head motion small enough that the fabric and hair motion
  it implies stays proportionate; large head motion needs correspondingly more
  hair and fabric lag, which is exactly where generation artifacts increase.

Why: real hair and fabric have mass and drag, so they never move at the exact
instant or exact rate of the body driving them; that time lag is a low-level
physical cue the eye reads as "this has weight in the real world," and its
absence is one more small signal that stacks up to an overall synthetic
impression even when the face itself syncs well.

Example: "loose, shoulder-length hair with slight trailing motion after head
turns, soft-collared top with natural fabric drape."

Counter-example: tightly slicked-back hair and a stiff, structured collar on a
subject who also barely moves their head, removing every opportunity for
secondary motion to prove the scene has physical weight.
