---
id: cards-and-lists-responsive-grid-breakpoints
title: Sizing card grids by content, not breakpoints
category: component
subcategory: cards-and-lists
tags: [responsive, grid, css, layout]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Size card grids by a minimum card width using auto-fill, not by a hand-maintained column count per breakpoint — column count should be a derived value, not a stored one.

- Use `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` (or the equivalent in the framework at hand) so the browser computes column count from available width.
- Set the minmax floor to the card's real minimum usable width — enough for a thumbnail plus a title that doesn't truncate excessively — typically 220-280px for a 16:9 or 1:1 thumbnail card.
- Scale the gutter with the density preset, not the screen size: a comfortable-density grid keeps a consistent gap (e.g. 16px) across all breakpoints, and only the column count changes.
- Below roughly 480px, collapse the grid to a single-column list of rows rather than continuing to shrink cards under their minimum — a card squeezed below ~200px stops being scannable.
- If the container width leaves a lone card dangling on the last row, adjust the minmax value or center the row rather than shipping a visually lopsided grid.

Why: hand-maintained per-breakpoint column counts (4 at 1200px, 3 at 900px, 2 at 600px) drift out of sync with the real width distribution of devices — foldables, split-screen multitasking, browser zoom, sidebar-collapsed dashboards — none of which land neatly on the breakpoints that were tested. Content-based sizing self-corrects at any width without new media queries, removing an entire recurring class of layout bugs.

Example: "grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px."
Counter-example: hardcoded breakpoints assuming 4/3/2 columns, which leaves cards squeezed or the grid visibly uneven at an untested 780px split-screen width.
