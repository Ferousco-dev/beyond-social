---
id: match-cuts-and-continuity-last-frame-seeding
title: Seeding the next clip from the previous clip's last frame
category: editing
subcategory: continuity
tags: [frame-chaining, image-to-video, continuity, workflow]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

When a platform supports image conditioning, feeding the literal last frame of one
clip as the starting image of the next removes the guesswork of describing a body
position in words and is the closest thing to true continuity in generated video.

- Export the final frame of the preceding clip at full resolution and use it as
  the init image for the next generation call.
- Trim a few frames of handle before the cut point so any end-of-clip warping is
  not the frame being seeded from.
- Where a platform lacks image conditioning, describe the terminal pose and
  position in text with the same specificity used for identity and wardrobe
  ("hand at 80 percent extension toward the cup, fingers beginning to curl").
- Check the seeded frame for artifacts (an extra finger, a warped edge) before
  using it; whatever is wrong in that frame propagates into the next clip.

Why: text prompts describe intent, but a seeded frame carries exact geometry, so
chaining frames sidesteps the model re-interpreting a pose from scratch each time
and is the most reliable way to make two independent generations look like one
continuous take.

Example: "init_image: frame_089.png (last frame of previous clip), continue the
same reach toward the cup at the same hand angle."
Counter-example: writing "hand still reaching for the cup" from a blank prompt and
letting the model reinvent the hand's position, angle, and finger count.
