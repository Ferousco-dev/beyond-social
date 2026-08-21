---
id: micro-interactions-card-hover-elevation
title: Card hover elevation and lift
category: motion
subcategory: interaction-design
tags: [cards, hover, elevation, shadow]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce, marketing-site, portfolio]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A clickable card's hover state should read as the card physically lifting toward
the viewer, which requires pairing a transform with a shadow change; shadow alone
is too subtle to register as elevation.

- Combine `translateY(-2px to -4px)` with an increased shadow blur and spread
  (for example `0 2px 8px` at rest to `0 4px 16px` on hover), so the shadow grows
  the way it would if the card actually moved further from a fixed light source
  above it.
- Duration 150-200ms, ease-out. A lift that's too slow makes the card feel heavy;
  too fast and the shadow change looks like a flicker rather than a movement.
- Keep the shadow color a dark, low-saturation tint of the surface color rather
  than pure black; pure black shadows at typical card-elevation strength look
  flat and stickered-on instead of physically cast.
- Only apply the lift to cards that are actually actionable (clickable, linking
  somewhere). A static, non-interactive card that lifts on hover is a false
  affordance: it promises an action that doesn't exist.
- Use the lift as the single elevation cue; don't stack it with a scale change
  too, since translate and scale both reading as "getting bigger" is redundant
  and starts to feel like the card is jumping rather than lifting.

Why: at normal viewing distance and typical shadow-blur radii, a shadow-only
change is a subtle difference most users won't consciously notice, so it fails to
communicate that the card is now in an active hover state. Pairing it with a small
upward translate mimics how a real object simultaneously moves and casts a
longer, softer shadow when lifted off a surface under a fixed overhead light,
which is a physical cue people read instantly without having to think about it.

Example: `.card:hover { transform: translateY(-3px); box-shadow: 0 4px 16px rgba(20,20,30,0.12); }`

Counter-example: hover only darkens the card's background fill with no shadow or
transform change. It reads as a color glitch rather than an elevation cue and gives
no signal that the card is interactive at all.
