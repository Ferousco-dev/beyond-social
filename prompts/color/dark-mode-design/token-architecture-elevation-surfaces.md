---
id: dark-mode-design-token-architecture
title: Elevation-based surface tokens instead of one background color
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, tokens, elevation, surfaces]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A dark theme needs a ladder of surface tokens, not a single "background" and
"foreground" pair. Depth in dark mode is communicated by lightness steps, so
every stacking level (page, card, modal, popover, tooltip) needs its own token.

- Define `surface-0` through `surface-4` (or similar), each a few percent
  lighter than the last, e.g. `#0b0d10`, `#121417`, `#191c20`, `#212429`.
- Never let a modal or popover reuse the page background; it must sit visibly
  above it, which in dark mode means lighter, not darker with a drop shadow.
- Keep every surface token a neutral (or slightly warm/cool-tinted) gray, not
  pure black — pure black surfaces have nowhere to go lighter when a fifth
  level of stacking appears.
- Map text, border, and icon tokens to each surface level too (`text-on-surface-2`
  etc.), since a single global text color will fail contrast on the lightest
  surface or look washed out on the darkest.

Why: in light mode, elevation reads through shadow because light sources cast
believable shade on white paper. On a dark surface, shadows are nearly
invisible — the eye has no baseline to perceive a subtle darkening of already-
dark pixels. Lightness becomes the only depth cue that still works, so the
token system has to be built around a stepped scale from the start, not
retrofitted after the light theme is done.

Example: `--surface-0: #0c0e11; --surface-1: #14171b; --surface-2: #1c2025;
--surface-3: #262b31;` with card = surface-1, modal = surface-3.

Counter-example: `--bg-dark: #000000; --card-dark: #000000;` with a
`box-shadow: 0 4px 12px rgba(0,0,0,0.4)` on the card — the shadow disappears
against black and the card is visually indistinguishable from the page.
