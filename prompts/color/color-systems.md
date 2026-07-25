---
id: color-semantic-tokens
title: Semantic color systems and tokens
category: color-system
tags: [color, tokens, theming, dark-mode]
applicability:
  platforms: [web, mobile]
  productTypes: []
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Design with semantic tokens, not raw hex. Define roles, background, surface,
border, text, text-muted, primary, on-primary, success, warning, danger, then map
each role to a value per theme. Components reference roles, so retheming or adding
dark mode edits the token map, never the components.

Build neutrals from a single tuned ramp (about 10 steps) and choose one accent;
add semantic status colors only as needed. For dark mode, do not invert: raise
surface lightness for elevation instead of using shadow, and slightly desaturate
accents so they do not vibrate on dark backgrounds.

Why: a role-based system is the only thing that keeps color consistent as a
product grows and makes theming a data change. Contrast requirements (see the
accessibility chunk) are far easier to guarantee against a fixed ramp than against
scattered literals.

Example: `--surface`, `--text`, `--primary` remapped per theme; one accent, one
neutral ramp. Counter-example: hardcoded `#5B21B6` sprinkled through components
and a dark mode built by inverting every color.
