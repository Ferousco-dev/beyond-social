---
id: indoor-vs-outdoor-setups-overcast-sky-as-dome-softbox
title: Overcast sky as a directionless outdoor softbox
category: lighting
subcategory: indoor-vs-outdoor-setups
tags: [outdoor, overcast, diffused-light, shadowless]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

An overcast sky acts as a giant, shadowless diffuser, the outdoor equivalent of a
huge bounced source, but with no single direction at all.

- Overcast light comes from the whole sky dome, not one point. Say "flat
  overcast" or "diffused daylight, no visible sun" instead of naming a light
  direction, because there isn't one.
- Shadows nearly vanish; only contact shadows remain directly under objects
  (feet, chin, a parked car). Don't ask for rim or side light on an overcast
  day, it will read as physically wrong.
- Because it's directionless, overcast is the most forgiving light for skin and
  product texture but also the flattest. Pair it with a small named practical or
  reflector for any shape: "soft overcast fill, faint warm reflector bounce under
  the chin."
- Color reads cool-neutral by default, roughly 6500-7500K; call it out if a warm
  cast should be avoided or deliberately added via a reflector.

Why: naming "overcast" instead of a generic "outdoor lighting" tells the model to
drop directional shadow logic entirely, which prevents it from hallucinating a sun
position that then produces shadows inconsistent with the stated flat sky.

Example: "outdoors under flat overcast sky, soft shadowless light on the
subject's face, only a faint contact shadow under the chin."
Counter-example: "outdoor scene with dramatic sunlight and shadows" applied to a
described overcast day, a direct physical contradiction that reads as a lighting
error in the render.
