---
id: navigation-patterns-sidebar-collapse-rail
title: Collapsing a sidebar to an icon rail
category: component
subcategory: navigation
tags: [navigation, sidebar, dashboard, density]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A dense dashboard sidebar should collapse to a narrow icon-only rail rather than
disappear entirely, so users reclaim canvas width without losing their place in
the hierarchy.

- Collapsed width should be just wide enough for a 20-24px icon plus padding,
  typically 56-64px — enough to stay tappable, not enough to compete with
  content.
- Icon-only state still needs a tooltip on hover/focus showing the label; an
  icon rail with no label fallback fails users who haven't yet memorized the
  icon set.
- Persist the collapsed/expanded state per user (localStorage or account
  preference), not per session — users who collapse it once want it collapsed
  every time they return.
- Keep the active-item indicator (background fill, left border accent) visible
  in both states so users can tell where they are without expanding.
- Provide the toggle as a persistent, low-profile control (chevron at the
  sidebar's bottom or top edge), not buried in a settings menu.
- Do not collapse sections independently while leaving the shell expanded —
  collapse is a width-level state, not a per-group accordion; conflating the
  two confuses "which arrow does what."

Why: power users of dashboards work in the same tool for hours and value screen
real estate over onboarding-friendly labels; a rail trades label visibility for
density once the icon vocabulary is learned, but only if the fallback tooltip
keeps new users from being stranded.

Example: "sidebar collapses from 240px to 60px on toggle, icons keep tooltips,
active route keeps its accent bar in both states."

Counter-example: a sidebar that hides completely on collapse, forcing a
hamburger click just to see whether five sections or fifteen exist underneath.
