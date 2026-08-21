---
id: buttons-and-ctas-video-end-card-overlay
title: CTA buttons overlaid on video ad creative
category: component
subcategory: buttons-and-ctas
tags: [cta, video, overlay, ad-creative]
applicability:
  platforms: [tiktok, instagram, youtube, facebook]
  productTypes: [short-form-video, ad-creative, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A CTA button burned into a video ad's end card behaves like a UI component
even though it's rendered as pixels, not markup — it still needs hierarchy,
contrast, and a hit-target-sized footprint, because most platforms turn that
region into an actual tappable overlay.

The recipe:

- Design the end-card CTA as a solid-fill button shape (not floating text) so
  it reads as tappable even before the platform's native "Shop now" / "Learn
  more" overlay button lands on top of it — the burned-in graphic and the
  platform's real tap button should align, not compete for the same space.
- Hold the end card for at least 2-3 seconds at full CTA visibility; a card
  that flashes for under a second doesn't give a thumb time to register and
  react, especially at typical scroll speeds.
- Keep the CTA graphic inside the safe zone platforms define for each format
  (roughly the center 80% of frame, clear of the top status bar and bottom
  UI chrome that TikTok/Reels/Shorts overlay on every video) so it isn't
  physically covered by the app's own interface.
- Contrast the button fill against the last frame's background at the same
  4.5:1 minimum as any other UI button — a low-contrast CTA over a busy
  product shot disappears exactly when it matters most.
- Match the burned-in label to the platform's native CTA button wording where
  possible ("Shop now" over "Shop now," not "Buy today") so the two don't
  visually argue with each other.

Why: viewers treat any button-shaped, high-contrast rectangle at the end of a
video as a tap target by reflex, whether or not it's the real interactive
element — sloppy alignment between the baked-in graphic and the platform's
actual overlay creates a visible seam that reads as an unpolished ad.

Example: an end card holding for 3 seconds with a solid button reading "Shop
now" centered in the safe zone, sized and positioned to sit directly under
the platform's native CTA overlay.

Counter-example: a CTA rendered as thin, low-contrast text in the bottom-left
corner for half a second, partly hidden behind the app's own caption bar.
