---
id: dark-mode-design-photo-illustration-treatment
title: Photography and illustrations need their own dark-mode treatment
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, imagery, illustration, framing]
applicability:
  platforms: [web, mobile]
  productTypes: [marketing-site, e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Raster photography and flat-color illustrations were composed against
implicit white space; dropping them directly onto a near-black background
without adjustment produces either a "cutout floating in a void" look or
crushed shadow detail where the photo's dark areas merge into the page.

- Give photos a subtle container: a 1-2px light border, a slight surface-token
  background card, or rounded corners with a faint inner shadow, so the
  image's edge is legible against the dark page instead of bleeding into it.
- Check shadow detail in every hero/product photo at the actual dark-mode
  brightness — an image shot or edited assuming a white surround often has
  crushed blacks that vanish entirely once the page itself is black.
- For illustrations with white or near-white backgrounds baked into the
  asset, either re-export with transparency or accept the white card look
  deliberately as a framing device — never let the asset's white background
  silently become an unintended bright rectangle mid-page.
- Line-art and icon illustrations drawn with dark strokes on transparent
  backgrounds need a stroke-color swap for dark mode (light stroke), not just
  a background swap, or they disappear entirely.

Why: an image asset carries its own implicit "paper" assumption from how it
was shot, retouched, or exported. Dark mode changes the paper the asset sits
on, and unlike UI chrome (which is tokens you author), imagery is fixed
pixels — so the container around it is the only lever left to make it belong
on the page.

Example: product photo in a `surface-1` rounded card with 16px padding and a
1px `rgba(255,255,255,.08)` border, rather than placed edge-to-edge on `surface-0`.

Counter-example: dropping a photo shot on white seamless paper directly onto
a pure black page — the paper background reads as a glaring white rectangle
that dominates the layout.
