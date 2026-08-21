---
id: keyboard-and-focus-management-visible-focus-ring
title: Designing a focus ring that survives real backgrounds
category: accessibility
subcategory: keyboard-and-focus-management
tags: [focus-ring, contrast, wcag, visual-design]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A focus indicator only works if it is visible against every background it
will ever sit on, including images, gradients, and the component's own hover
and selected states — a single flat color ring fails half the time.

- Use a two-layer ring: an inner outline in the accent color plus an outer
  1-2px contrasting halo (often the page background color) so the ring reads
  against both light and dark, and busy, surfaces underneath it.
- Meet WCAG 2.2's non-text contrast requirement: the focus indicator must
  have at least 3:1 contrast against the adjacent colors on both sides of
  its boundary, and be at least as large as a 2px outline around the
  component (or an equivalent area).
- Offset the ring 2-3px from the element edge (`outline-offset`) so it does
  not get absorbed into the component's own border or fill.
- Define the ring once as a design token (`--focus-ring`) and apply it
  everywhere via the same CSS custom property, not per-component
  `box-shadow` values that drift out of sync.
- Test it on the actual dark-mode palette and on the busiest real background
  in the product (a photo card, a colored status pill), not just a plain
  white mockup.

Why: `outline: none` with nothing to replace it is the single most common
accessibility regression, because it is invisible in a quick visual QA pass
and only surfaces when someone actually tries to tab through the page.

Example: `--focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent-9);`
applied via `:focus-visible` on every interactive primitive.

Counter-example: `button:focus { outline: none; box-shadow: 0 0 0 2px
#3b82f6; }` on a button whose default background is already a similar blue —
the ring nearly disappears against the fill it sits on.
