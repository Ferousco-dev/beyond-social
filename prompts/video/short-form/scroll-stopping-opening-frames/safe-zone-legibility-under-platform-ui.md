---
id: scroll-stopping-opening-frames-safe-zone-legibility
title: Composing around the platform's UI overlay
category: short-form
subcategory: opening-frames
tags: [ui-safe-zone, composition, platform, opening-frame]
applicability:
  platforms: [tiktok, instagram]
  productTypes: [short-form-video, ad-creative, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

The literal first frame a viewer sees is never the full canvas; captions,
profile handles, like/comment/share rails, and progress bars permanently
cover fixed regions of the screen on every major short-form platform. A
frame whose key content, a face, a product, the point of the shot, sits under
that permanent chrome is invisible at the exact moment it needs to land.

- Keep the critical subject, the eyes, the product, the action, inside the
  center 70-80% of the frame horizontally and vertically, clear of the
  right-edge action rail and bottom caption band.
- Check the bottom 15-20% and right-edge 10-15% of the frame specifically;
  these are the zones TikTok and Reels UI chrome sits over by default.
- Do not rely on the extreme top or bottom edges to carry meaning, a face
  cropped at the hairline by the caption band reads as a framing mistake, not
  a stylistic choice.
- Design the composition so it still reads correctly with those zones
  mentally blacked out; if the subject disappears under that overlay, reframe
  before generating.

Why: a technically strong first frame that scroll-stops in a clean preview
can still fail in the actual product because the UI silently eats the exact
region carrying the payoff; composing with the real overlay in mind is the
difference between a frame that works in review and one that works in the
feed.

Example: "frame 1: subject and product centered in the middle 70% of frame,
nothing essential within the bottom fifth or right edge of the canvas."
Counter-example: a product held low and to the right of frame, exactly where
the like and share icons sit, invisible the moment it's actually posted.
