---
id: pairing-and-scale-systems-tabular-figures
title: Tabular figures for numeric UI
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, numerals, dashboard, data]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Numerals in any UI that stacks numbers vertically, prices, dashboards,
countdowns, financial data, must use tabular (fixed-width) figures, not the
proportional figures most fonts default to for body text, or digits will
jitter and columns won't align.

- Enable via font-variant-numeric: tabular-nums in CSS, or the equivalent
  OpenType feature (tnum) if setting it through a font's feature panel.
- Apply it specifically to number-only contexts: table cells, price tags,
  countdown timers, stat tiles, not to inline numbers inside prose, where
  proportional figures read more naturally.
- Pair with lining figures, not old-style, for anything meant to align with
  capital letters or sit in a table header; old-style figures have varying
  baselines meant for inline reading, not columnar alignment.
- Check that the chosen typeface actually ships a tabular variant; not every
  font does, and unsupported fonts silently fall back to proportional.

Why: proportional figures are drawn with per-digit widths for better inline
reading rhythm, a "1" is narrower than an "8", which is correct for prose but
means a column of stacked numbers shifts horizontally every time a digit
changes. That jitter reads as unpolished in exactly the contexts, dashboards,
live counters, where numeric stability matters most.

Example: "font-variant-numeric: tabular-nums lining-nums;" applied to a stat
tile that updates every second, so the digits don't shift width on each tick.

Counter-example: a live-updating revenue counter set in default proportional
figures, visibly wobbling left and right as the digits change.
