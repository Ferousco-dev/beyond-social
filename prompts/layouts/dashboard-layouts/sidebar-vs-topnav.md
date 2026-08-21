---
id: dashboard-layouts-sidebar-vs-topnav
title: Choosing sidebar versus top navigation for dashboards
category: layout
subcategory: dashboard
tags: [navigation, dashboard, sidebar, information-architecture]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A left sidebar and a top nav bar solve different navigation-depth problems,
and picking between them should follow the product's actual section count,
not visual preference.

The recipe:

- Use a left sidebar when the product has more than five top-level sections
  or any section has its own sub-navigation; a sidebar's vertical list scales
  to depth (nested items indent naturally) in a way a horizontal bar cannot
  without an overflow menu.
- Use a top bar alone when the product has three to five flat sections with
  no sub-navigation; a sidebar in that case wastes horizontal width the
  widget grid needs and adds a collapse/expand interaction for no real
  navigational benefit.
- Make the sidebar collapsible to icon-only width (roughly 64px) rather than
  fully hidden, so the current section stays identifiable by icon even when
  the user reclaims width for the data grid.
- Keep global, cross-section controls (workspace switcher, account menu,
  search) in the top bar regardless of which pattern is chosen, since those
  belong above section-level navigation, not nested inside it.
- On mobile, both patterns collapse to the same solution: a bottom tab bar
  for the four or five most-used sections plus an overflow "more" entry,
  since a slide-out sidebar and a horizontal scroll-nav both perform worse
  than fixed bottom tabs for one-handed use.

Why: navigation depth and screen real estate trade off directly — a sidebar
costs 200-280px of permanent width in exchange for scalable depth and
persistent orientation, while a top bar costs nothing in width but caps out
fast once sections need their own sub-items, so the right choice depends on
which resource the product's actual information architecture needs more.

Example: a five-plus-section product (Dashboard, Videos, Templates,
Analytics, Team, Settings, with Settings itself having six sub-pages) using a
collapsible left sidebar with nested items under Settings.
Counter-example: a three-section product (Dashboard, Videos, Billing) forcing
all three into a sidebar anyway, permanently consuming 240px of width the
main grid could have used, for navigation depth the product doesn't have.
