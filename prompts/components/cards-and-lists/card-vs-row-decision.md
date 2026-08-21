---
id: cards-and-lists-card-vs-row-decision
title: Choosing a card over a row
category: component
subcategory: cards-and-lists
tags: [cards, lists, layout, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Use a card when the item's visual identity (a thumbnail, avatar, or preview) is the fastest way to recognize it. Use a row when the item is mostly textual and the user is comparing a shared set of attributes across many items.

- Card wins for recognition-based browsing: video projects, product photos, templates — anything where the image, not the label, tells the user what it is.
- Row wins for comparison-based work: sorting by date, scanning a status column, bulk-selecting — table structure supports left-to-right attribute scanning that a card grid cannot.
- Card suits low-density, high-recognition tasks (visual selection); row suits high-density, task-oriented tasks (batch actions, precise sorting).
- Mixed content breaks card layout: if half the items have no image, either backfill with deliberate placeholder art or switch the whole list to rows.
- Card grids reflow naturally with viewport width; rows need horizontal scroll or progressive column-hiding on narrow screens, which is more engineering cost.

Why: recognition memory and comparison memory are different cognitive tasks. A card leans on recognition memory — the eye matches a shape or image faster than it reads text, which is why photo-driven browsing (a video library, a product catalog) works as cards. A row leans on structured comparison — aligned columns let the eye run a consistent horizontal scan across many items, which recognition-first cards actively interfere with by varying image size and position.

Example: "Render each generated video as a card: thumbnail first, title below, status badge top-right."
Counter-example: forcing 40 video projects with no thumbnails into a card grid, so every row looks like an identical gray box and the user has to open each one just to tell them apart — this was a table wearing a card costume.
