---
id: cards-and-lists-text-truncation
title: Truncating text without hiding decisions
category: component
subcategory: cards-and-lists
tags: [truncation, content-design, typography, lists]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Truncation is a content-design decision, not just a CSS property — it must always leave the full text recoverable, and it must never cut the field the user opened the list to check.

- Clamp titles to a single line at a fixed width with an ellipsis; never hard-clip so the last visible character is mid-glyph.
- Always pair truncation with a way to recover the full string: a hover title attribute works on desktop, but touch needs tap-to-expand or a detail view, since there is no hover to fall back on.
- Choose truncation direction by where the meaningful part of the string lives: file paths and URLs truncate in the middle ("brand_assets…al_v3.mp4") to preserve both the start and the extension; sentences truncate at the end.
- Truncate secondary and tertiary fields before ever touching the field the user is scanning to decide their next click — usually status or a key number.
- For multi-line clamps (e.g., a two-line description), keep card height consistent across the grid so the ellipsis lands at the same visual point on every card, not a different height per item.

Why: truncation hides information, and the wrong field or wrong cut point can hide the exact detail — a version number, a status word, a percentage — that determines what the user does next. Treating it as a purely visual CSS concern (line-clamp and move on) is how a list ends up technically legible but functionally unusable for the one decision it exists to support.

Example: "'brand_assets_2024_final_v3.mp4' truncates to 'brand_assets…al_v3.mp4', keeping the extension visible."
Counter-example: truncating "Rendering — 2 min remaining" down to "Rendering…" — the one number the user opened the list to check is gone.
