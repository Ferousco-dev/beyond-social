---
id: practical-and-motivated-sources-inverse-square-falloff
title: Inverse-square falloff from a practical
category: lighting
subcategory: practical-and-motivated-sources
tags: [falloff, inverse-square, physics, contrast]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Light from any small practical source drops off sharply with distance under
the inverse-square law, so brightness in frame should visibly decay from near
to far rather than stay flat.

- Doubling the distance from a point-like practical (a bulb, a candle, a
  phone) cuts intensity to roughly a quarter, not half; falloff is steep and
  fast, not a gentle gradient.
- Anything within about one source-width of the practical should read
  noticeably brighter than the same object two or three source-widths away.
- Large practicals (a whole window, a wall of neon signage) fall off far more
  gently than small ones (a bulb, a candle); specify the source's size, not
  just its presence.
- Background elements more than a few feet from a small lamp should read as
  underlit or near-black, not merely "a bit dimmer."
- When two people sit at different distances from the same practical, they
  should not be lit equally.

Why: inverse-square falloff is a real optical law, not a stylistic choice, and
generated video defaults to even, shadowless illumination because that is
close to the statistical average of its training data. Explicitly demanding
steep falloff overrides that default toward physically correct light.

Example: "single lamp two feet from the subject, falloff steep enough that the
far wall six feet back reads nearly black."

Counter-example: "a lamp in frame, but the whole room reads at similar
brightness." This ignores falloff physics and is one of the most reliable
giveaways of unmotivated lighting.
