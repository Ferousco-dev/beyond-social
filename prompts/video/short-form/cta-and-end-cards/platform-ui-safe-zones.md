---
id: cta-and-end-cards-platform-ui-safe-zones
title: Keeping the CTA out of the platform's own UI
category: short-form
subcategory: layout
tags: [safe-zone, layout, ui, cta]
applicability:
  platforms: [tiktok, instagram]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Every vertical platform overlays its own chrome on top of the video, and a
CTA placed where that chrome sits gets physically covered before anyone can
read it.

- Keep critical text out of the right-side 15% of frame width (like, comment,
  share, bookmark stack).
- Keep the bottom 20% of frame height clear or treat it as background only
  (username, caption, sound title, "..." more).
- Keep the top 8% clear of the status bar/profile row on some surfaces.
- Center the CTA in the middle 60% of the frame, both axes, as a default safe
  target.
- Check the composition against the actual app chrome, not just a blank
  1080x1920 canvas, before finalizing placement.

Why: the safe area isn't a platform guideline, it's a hard occlusion — text
under the like button on TikTok or under the caption line on Reels is
literally invisible to a huge share of viewers regardless of how well it's
designed, because it's covered by opaque interface elements the creator does
not control and that shift slightly by app version and device.

Example: CTA text centered horizontally, sitting in the vertical band between
30% and 65% of frame height, clear of both the caption stack and the action
column.

Counter-example: a CTA card with the text anchored bottom-right "for balance"
— on TikTok this sits directly under the share icon and is unreadable on
nearly every device.
