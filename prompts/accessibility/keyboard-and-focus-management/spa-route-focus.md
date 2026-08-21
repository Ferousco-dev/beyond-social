---
id: keyboard-and-focus-management-spa-route-focus
title: Managing focus on client-side route changes
category: accessibility
subcategory: keyboard-and-focus-management
tags: [spa, routing, focus-management, navigation]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A full page load resets focus to the top of the document automatically; a
client-side route change in an SPA does not, so without explicit handling
focus silently stays on whatever link was clicked while the entire screen
underneath it changes.

- On every route change, move focus to a stable, consistent target: the new
  page's `<h1>` (`tabindex="-1"` plus `.focus()`), or a persistent
  `role="status"` region announcing the new page name if a heading focus
  would be jarring for the specific flow.
- Update `document.title` on every route change so both the browser tab and
  assistive tech announce which page loaded, independent of the focus move.
- Do not focus `<body>` or leave focus on the now-stale nav link — the next
  Tab press should continue naturally from the top of the new content, not
  from wherever the old link happened to sit.
- Skip the focus move for same-page interactions that update the URL
  incidentally (query-param filters, tab state in the URL) — only genuine
  navigations to a new "page" warrant it, or focus will jump distractingly
  during routine interaction.
- Test with a screen reader specifically: visually the new content is
  obviously there, but confirm it is actually announced, since visual
  proof is not proof of an accessible route change.

Why: SPA routing was built to make transitions feel instant for sighted
users, but it silently removed the one accessibility feature a full page
load gave for free — without a deliberate replacement, screen reader users
get no signal that navigation happened at all.

Example: navigating from a product list to a product detail page moves
focus to the detail page's `<h1>` and updates `document.title` to the
product name.

Counter-example: a router that swaps the entire main content on click but
leaves focus sitting on the now-detached list-item link — the screen reader
user hears nothing change and keeps navigating the old, gone content by
habit.
