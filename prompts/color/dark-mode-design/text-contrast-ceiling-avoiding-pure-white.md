---
id: dark-mode-design-text-contrast-ceiling
title: Cap body text below pure white to avoid halation on dark backgrounds
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, contrast, typography, accessibility]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, blog, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Pure white text (`#FFFFFF`) on a near-black background (`#0A0A0A`) produces a
contrast ratio so far above the readability minimum that it starts working
against readability: the extreme luminance jump causes halation, where bright
strokes appear to bloom and bleed into the dark surroundings, especially on
OLED and high-brightness displays.

- Cap primary body text around `#E4E4E7`-`#EDEDF0` (roughly 87-92% white) on a
  near-black surface — comfortably above WCAG AA and visibly softer.
- Reserve true `#FFFFFF` for small, high-emphasis moments only: a single
  headline word, an active icon, a notification dot — not paragraphs.
- Scale secondary/tertiary text down further (60-70% and 40-50% white
  respectively) rather than using opacity alone, since opacity compounds with
  whatever sits behind it and produces unpredictable results over images.
- Verify the final ratio against the actual surface token, not against
  `#000000` — a `surface-2` token that is already `#1c2025` changes the
  effective ratio meaningfully versus a pure-black assumption.

Why: contrast guidelines set a floor (AA, AAA) for legibility, but they don't
set a ceiling for comfort. Very high luminance differentials fatigue the eye
faster in low-ambient-light viewing conditions, which is exactly when users
have dark mode turned on. Undershooting slightly from maximum contrast is a
deliberate readability choice, not a compliance shortcut.

Example: `color: #E4E4E7;` for body copy on `background: #0c0e11;`, reserving
`#FFFFFF` for the metric number in a stat card.

Counter-example: `color: #FFFFFF; background: #000000;` for a full paragraph
of body text — technically passes contrast checks but produces visible
blooming and eye strain during extended reading.
