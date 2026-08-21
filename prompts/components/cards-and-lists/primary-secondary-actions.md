---
id: cards-and-lists-primary-secondary-actions
title: Action hierarchy on cards and rows
category: component
subcategory: cards-and-lists
tags: [actions, buttons, hierarchy, touch]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Every card or row gets exactly one visible primary action; everything else lives behind an overflow menu, not as a row of equal-weight icon buttons.

- Show one default action ("Open," "Play," "Resume") at full visual weight; collapse secondary actions (rename, duplicate, share) into a kebab menu.
- Never place a destructive action (delete, archive) directly adjacent to the primary action without a visual separator or distinct color — an accidental adjacent tap should not be catastrophic.
- Hover-reveal actions are fine on desktop rows, but touch has no hover state, so every hover-only action needs a persistent equivalent: an always-visible overflow icon or a long-press menu.
- Label icon-only buttons with a tooltip or aria-label; never ship a primary action as an icon whose meaning depends on a hover tooltip alone, since first-time users won't hover to discover it.
- Extend the tap/click hit area at least 8px beyond the visual icon boundary so the button is forgiving without looking oversized.

Why: this is Hick's law in practice — the time to choose an action grows with the number of equally-weighted choices presented at once. A row with five full-opacity icon buttons forces the user to parse and discard four options every time, even when they always pick the same one. Consolidating to a single default plus an overflow menu removes that per-row decision cost and keeps destructive actions a deliberate two-step choice instead of a stray click away.

Example: "row: thumbnail, title, status; primary button 'Resume' right-aligned; kebab menu holds Rename, Duplicate, Delete."
Counter-example: five icon buttons (edit, share, download, duplicate, delete) all at full opacity on every row, with delete sitting one pixel from download — a single mis-click destroys work.
