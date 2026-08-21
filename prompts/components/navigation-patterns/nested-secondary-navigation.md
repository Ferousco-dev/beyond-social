---
id: navigation-patterns-nested-secondary-nav
title: Pairing primary navigation with contextual secondary navigation
category: component
subcategory: navigation
tags: [navigation, sidebar, hierarchy, information-architecture]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

When a top-level section has its own set of sub-views, add a second,
contextual navigation layer rather than deepening the primary sidebar or tab
bar — the primary layer answers "which section," the secondary layer answers
"which view within it."

- Render secondary nav as a distinct visual layer: a slim second sidebar column
  to the right of the primary one, or a horizontal tab strip directly under the
  page header — never as indented items merged into the primary list.
- Secondary nav items change per section; primary nav items do not. If a
  primary item's sub-items are visible before the section is even selected,
  the two layers have been fused incorrectly.
- Limit secondary nav (as horizontal tabs) to what fits on one line without
  scrolling on the smallest supported desktop width; if it overflows, that
  section needs its own left-hand sub-sidebar instead of tabs.
- Keep the secondary layer's active-state styling visually subordinate to the
  primary layer's (smaller weight, less saturated accent) so the hierarchy
  reads correctly at a glance.

Why: two flat lists merged into one deep list forces users to parse hierarchy
depth from indentation alone, which is slow and error-prone; a genuinely
separate visual layer lets users answer "where am I" in two fast lookups
(section, then view) instead of scanning a long nested tree every time.

Example: "primary sidebar: Analytics, Billing, Team, Settings. Selecting
Settings reveals a horizontal tab strip: General, Members, Integrations,
Danger Zone."

Counter-example: a single sidebar where Settings expands inline into six
indented sub-links pushing every item below it down the page, so the list's
length and order changes depending on what's expanded.
