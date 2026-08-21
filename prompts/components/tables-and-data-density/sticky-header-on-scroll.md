---
id: tables-and-data-density-sticky-header-on-scroll
title: Sticky header row on vertical scroll
category: component
subcategory: tables-and-data-density
tags: [tables, sticky, scroll, layout]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A table with more rows than fit on screen needs its header pinned to the top of
the scroll container, not the browser viewport, so column labels stay attached to
the correct data as the body scrolls underneath.

- Use `position: sticky; top: 0` on the header row within its own scrollable
  container (not the page), so the header stops at the container's edge, not the
  window's.
- Give the sticky header an opaque background matching the table surface; a
  transparent header lets body text bleed through and become unreadable.
- Add a 1px hairline border or a soft 2-4px drop shadow under the header only once
  the body has scrolled past zero — this "lift" cue tells the user the header is
  now floating above content, versus sitting flush at the top of an unscrolled
  table.
- Set the header's `z-index` above body rows but below any modal, dropdown, or
  tooltip that can render inside a cell (row action menus especially).
- Keep the header's column widths locked to the body's via a shared `<colgroup>`
  or matched flex-basis values so columns don't drift out of alignment as content
  reflows.

Why: once a table exceeds one viewport, users lose the header-to-column mapping
within a few rows of scrolling; a pinned header keeps that mapping intact without
forcing the user to scroll back up to re-orient, which is the single biggest
usability cost of long, unpaginated tables.

Example: header background `var(--surface-1)`, `box-shadow: 0 1px 0 var(--border),
0 4px 8px rgba(0,0,0,0.04)` applied only after `scrollTop > 0`.

Counter-example: a header with a transparent or semi-transparent background that
looks fine at the top of the table but turns into illegible overlapping text the
moment three rows of data scroll underneath it.
