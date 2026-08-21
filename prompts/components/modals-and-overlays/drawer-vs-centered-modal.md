---
id: modals-and-overlays-drawer-vs-centered-modal
title: Side drawers versus centered modals
category: component
subcategory: modals-and-overlays
tags: [drawer, side-panel, modal, contextual-overlay]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A side drawer keeps the triggering context visible and is right for tasks that reference the page behind it, such as inspecting a row while the table stays visible; a centered modal fully occludes the page and is right for tasks that don't need that reference.

- Use a drawer when the user needs to compare the panel's content against the list, table, or canvas it came from, such as a detail panel for a selected row.
- Use a drawer for tasks the user repeats, opening, glancing, closing, and reopening a different item, since a drawer's persistent position reduces the re-orientation cost a re-centering modal would add each time.
- Use a centered modal when the task needs full attention and referencing the background page provides no value, such as a settings form or a confirmation.
- Keep a drawer's width proportionate, typically 360-480px on desktop, wide enough to read comfortably but never so wide it functionally becomes a full-screen modal wearing a slide-in animation.
- Slide the drawer from the edge nearest its trigger, usually the right in left-to-right layouts, and stay consistent about whether it pushes or overlays the page; don't mix the two behaviors in one product.

Why: The drawer's core advantage is spatial: it lets the user hold two contexts in view at once, which a modal by design refuses to do. Picking the wrong one either steals context the user needed, when a modal was used where a drawer belonged, or leaves stale background content half-visible and distracting when it should have been fully backgrounded.

Example: "Click a table row: a 400px drawer slides in from the right, the table stays visible and scrollable at 60% width."
Counter-example: "Click a table row and the whole screen dims behind a centered modal." The user loses the ability to see the row's position relative to its neighbors while editing it.
