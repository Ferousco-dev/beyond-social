---
id: dark-mode-design-elevation-via-lightness
title: Elevation overlays replace drop shadows as the depth cue in dark UI
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, elevation, shadow, depth]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Shadows communicate elevation by darkening the surface behind an object
relative to a lighter surroundings; on a dark UI there is no lighter
surroundings to darken against, so shadows must be replaced by a lightness
overlay that simulates a surface catching more ambient light the closer it is
to the viewer.

- Apply a semi-transparent white overlay (e.g. `rgba(255,255,255,0.05)` at
  elevation 1, up to `rgba(255,255,255,0.12)` at elevation 4) on top of the
  base surface color rather than trying to darken further.
- Pair the overlay with a very subtle 1px border (`rgba(255,255,255,0.08)`)
  to define the edge, since a soft overlay alone can look like a lighting
  gradient rather than a distinct object.
- Keep a thin, tight shadow for genuine cast-shadow situations (a floating
  action button over content) but make it low-opacity and small-radius — a
  hint of separation, not a light-mode-strength shadow copied verbatim.
- Never stack overlay opacity linearly with the exact same shadow blur/spread
  values used in light mode; the two systems solve the same problem with
  different physics and need independent tuning.

Why: real-world elevation cues come from two sources — occlusion shadow and
reflected/ambient light hitting the raised surface. Light mode design leans
almost entirely on the first; dark mode has to lean on the second because
occlusion shadow is invisible against near-black. Recognizing which physical
cue is actually available in each theme is what makes the token system look
intentional instead of like an inverted copy.

Example: a card at elevation 2 = `background: color-mix(in srgb, var(--surface-0) 90%, white 10%)` with a 1px `rgba(255,255,255,.08)` border, no shadow.

Counter-example: keeping `box-shadow: 0 8px 24px rgba(0,0,0,0.25)` from the
light theme unchanged on a dark card — the shadow renders as a barely visible
smudge and elevation reads as flat.
