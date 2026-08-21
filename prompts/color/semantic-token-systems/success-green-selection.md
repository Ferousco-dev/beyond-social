---
id: semantic-token-systems-success-green-selection
title: Choose a success green that reads as status, not as brand or eco
category: color-system
subcategory: hue-mapping
tags: [success, green, hue-mapping, semantic-color]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Success green needs its own narrow hue band, distinct from any "eco," "organic,"
or nature-brand green elsewhere in the product, and shifted enough from pure
lime or teal that it cannot be mistaken for an accent color.

- Target hue roughly 140-155 degrees, a true green rather than yellow-green
  (looks sickly) or blue-green (reads as teal/info, not success).
- Slightly desaturate versus a "grass" green; a fully saturated green at high
  lightness vibrates against neutral surfaces and looks like a toy UI.
- If the product has an unrelated green brand mark or illustration palette,
  push success a few degrees away from it so a success toast is never confused
  with a logo-colored decorative element.
- Test the success color specifically against the app's neutral surface
  colors, not just against white, since most UI is not pure white.

Why: green is a strong, fast signal for "this completed correctly," and that
speed depends on green appearing nowhere else in the interface with a
different meaning. A product that also uses green for a sustainability badge
or a brand illustration forces users to pause and disambiguate, which defeats
the entire purpose of a semantic color, which is to be read without thinking.

Example: success at `#16A34A` (hue ~142) on a neutral `#F8FAFC` surface reads
immediately as "done," with no other green anywhere else in the UI.
Counter-example: reusing a bright `#22C55E` brand-mascot green for both the
logo accent and the success toast, so a success message and a marketing badge
look like the same visual event.
