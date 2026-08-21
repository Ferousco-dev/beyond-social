---
id: navigation-patterns-mega-menu-catalogs
title: Mega menus for large category catalogs
category: component
subcategory: navigation
tags: [navigation, mega-menu, e-commerce, top-nav]
applicability:
  platforms: [web]
  productTypes: [e-commerce, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A mega menu — a wide dropdown panel showing multiple columns of categories at
once — belongs on top nav items with 15+ sub-destinations, such as e-commerce
category trees; below that count it is over-engineering that adds a hover
delay and a maintenance burden a simple dropdown wouldn't have.

- Trigger threshold: reach for a mega menu only once a single nav item's
  children exceed roughly 12-15 items or span more than one logical grouping
  (e.g., "Shop" needing Category, Brand, and Collection groupings
  simultaneously); fewer than that, use a standard single-column dropdown.
- Organize into labeled columns by category group, not as one long
  undifferentiated list — the column headers are what make a mega menu scannable
  instead of overwhelming.
- Include a featured visual (promo image, bestseller thumbnail) in at most one
  column to anchor the eye, but do not turn the whole panel into a marketing
  unit — its job is still primarily wayfinding.
- Open on click for touch/hybrid devices and on hover with a short intent delay
  (~150-300ms) for pointer devices, so users don't trigger it by accident
  passing the mouse over the nav bar.
- Keep total panel height within the viewport at common desktop resolutions —
  a mega menu that requires scrolling inside itself has failed its own premise
  of showing everything at once.

Why: once a category tree grows past what a single dropdown column can show
without scrolling, forcing it into one list makes scanning slower than reading
grouped columns side by side — the mega menu trades a deeper click path for a
wider, faster-to-scan single view, which only pays off when the underlying
catalog is actually that large.

Example: "Shop mega menu: four columns — Categories, Brands, Collections,
Featured (with one product image) — under a single hover trigger."

Counter-example: a mega menu built for a nav item with only 6 children,
rendering a mostly-empty wide panel that takes longer to open and scan than a
plain 6-item dropdown would have.
