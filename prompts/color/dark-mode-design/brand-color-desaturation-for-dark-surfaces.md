---
id: dark-mode-design-brand-color-desaturation
title: Desaturate saturated brand colors before placing them on dark surfaces
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, saturation, brand-color, contrast]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A brand's saturated light-mode accent (a punchy blue, purple, or green picked
against white) will visually vibrate and cause halation when placed directly
on a near-black surface, because the perceptual system amplifies chroma
against a dark ground.

- Reduce saturation by roughly 10-20% and raise lightness/value when moving a
  brand hue from a light-mode token to its dark-mode counterpart.
- Keep the hue angle identical so the color still reads as "the brand,"
  changing only S and L in HSL, not the hue itself.
- Test the accent at actual text size and at button-fill size separately —
  saturation that is fine as a small dot or icon can be uncomfortable to read
  as full-line text or a large filled surface.
- Never reuse the exact light-mode hex value for both themes and call it done;
  ship two tokens (`--brand-accent-light`, `--brand-accent-dark`) that share a
  hue but differ in saturation and lightness.

Why: on white, a saturated hue is dampened by the surrounding brightness and
the eye's adaptation to high luminance; on near-black, the same hue has
maximum relative contrast and chromatic aberration in the eye becomes visible
as a subtle glow or fringing around edges, especially for blues and reds. This
is the same reason movie subtitles are rarely pure white on black — the
brightness differential itself is the discomfort, not just the color choice.

Example: light-mode accent `hsl(262, 83%, 58%)` becomes dark-mode accent
`hsl(262, 65%, 68%)` — same violet hue, gentler saturation, lifted lightness.

Counter-example: shipping `hsl(262, 83%, 58%)` unchanged as a full-width CTA
button on a `#0a0a0a` page background — the button appears to glow and strains
the eye on OLED screens in low ambient light.
