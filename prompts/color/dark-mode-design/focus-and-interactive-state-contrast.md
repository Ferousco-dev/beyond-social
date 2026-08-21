---
id: dark-mode-design-focus-state-contrast
title: Interactive states need a separate contrast strategy in dark mode
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, focus-state, accessibility, interaction]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, auth, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Hover, focus, active, and selected states that rely on darkening a surface
(the default light-mode pattern of "10% darker on hover") have nowhere to go
on a surface that is already near-black, so dark mode needs those states
built on lightening and outlining instead.

- Hover: lighten the surface by a fixed step (match the elevation-overlay
  scale) rather than darken it — darkening a `surface-1` token by 10% is
  often visually imperceptible.
- Focus ring: use a 2px outline in an accent color with enough luminance
  contrast against every surface it might land on, offset from the element
  edge by 2px so it doesn't fight with the element's own border.
- Selected/active state: pair a lightness change with a persistent visual
  marker (a left border, a checkmark, a filled icon) rather than lightness
  alone, since some users will view the interface at reduced contrast or on
  a display that compresses subtle luminance steps.
- Disabled state: reduce contrast toward the surface color rather than toward
  black — a disabled control on dark mode should look like it's fading into
  the background it sits on, not turning darker than its surroundings.

Why: interaction states exist to be noticed reliably across a wide range of
viewing conditions — dim rooms, older displays, low-vision users — and
dark surfaces have much less headroom below their own value than light
surfaces have above white. Every state that assumes "go darker" silently
breaks the moment the base surface is already close to the bottom of the
luminance scale.

Example: `:hover { background: color-mix(in srgb, var(--surface-1) 92%, white 8%); }`
plus a 2px accent-colored focus ring offset outside the border.

Counter-example: reusing a light-mode hover rule of `filter: brightness(0.9)`
on a dark card — the visible change is a few percent of an already-low
luminance value and is effectively invisible to most users.
