---
id: tables-and-data-density-row-density-modes
title: Row density modes and the density toggle
category: component
subcategory: tables-and-data-density
tags: [tables, density, spacing, tokens]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Different users scanning the same table need different tradeoffs between rows
visible on screen and per-row legibility; expose that as a density toggle rather
than picking one fixed row height for everyone.

- Define three row-height tokens against a base grid: compact at 32px, comfortable
  at 40px, spacious at 48px — each a multiple of the base 8px spacing unit, not
  arbitrary values.
- Scale cell horizontal padding with density too (8px compact, 12px comfortable,
  16px spacious), not just row height, so compact mode doesn't just squeeze text
  vertically while leaving dead horizontal whitespace.
- Persist the chosen density per user (localStorage or account preference), not
  per session — someone who prefers compact tables wants that everywhere, every
  visit.
- Keep font size constant across density modes; density should change whitespace,
  not typography, or compact mode starts failing accessibility contrast/size
  minimums.
- Default to comfortable for new users; let power users (the ones scanning
  hundreds of rows daily, like ops or finance teams) opt into compact.

Why: a support agent triaging 200 tickets a day wants maximum rows-per-screen and
has the domain fluency to parse tight rows fast; a new user glancing at a
dashboard once a week needs more breathing room to parse the same data. One fixed
density optimizes for neither.

Example: density tokens `--row-h-compact: 32px; --row-h-comfortable: 40px;
--row-h-spacious: 48px;` with a three-icon toggle in the table toolbar.

Counter-example: hardcoding row height as `padding: 12px` directly in the row
component with no token and no toggle — retheming or adding density later
requires touching every table instance in the codebase instead of one value.
