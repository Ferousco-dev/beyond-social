---
id: semantic-token-systems-tonal-scale-per-semantic-role
title: Give every semantic color a full tonal scale, not one value
category: color-system
subcategory: token-architecture
tags: [tokens, tonal-scale, semantic-color, architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A single "danger" hex value is not enough; each semantic role needs a small
scale, typically background, border, subtle text, and solid fill, or a
component cannot be built without someone improvising a shade on the spot.

- Minimum scale per role: `-bg` (very light tint for banner/badge fill),
  `-border` (mid-tone for outlines), `-fg` (a text-safe shade, darker than
  `-border`), and `-solid` (the saturated shade for filled buttons or icons).
- Generate the scale from one base hue with fixed lightness/saturation steps,
  do not hand-pick each shade independently, or the scale will look uneven
  across roles.
- Keep the same four-step structure for success, warning, danger, and info so
  a "danger badge" and a "success badge" are built from parallel tokens, not
  bespoke recipes each time.
- Validate `-fg` on `-bg` and `-solid` on white/surface both hit accessible
  contrast independently, they are used in different contexts and need to
  pass separately.

Why: real interfaces need danger in at least four different visual weights on
a single screen, a subtle badge, a form field border, an inline error message,
and a delete button, and none of those should be the same pixel value. Without
a defined scale, each engineer eyeballs a shade, and the four danger elements
on one page end up visibly inconsistent, which reads as an unpolished,
AI-assembled interface rather than an intentional one.

Example: `--danger-bg: #FEF2F2; --danger-border: #FCA5A5; --danger-fg: #991B1B;
--danger-solid: #DC2626;` used consistently across badge, field, message, and
button.
Counter-example: one `--color-danger: #DC2626` token reused at various opacity
values improvised per component, producing a slightly different red on every
screen.
