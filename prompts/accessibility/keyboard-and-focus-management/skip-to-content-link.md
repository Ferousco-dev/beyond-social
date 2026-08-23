---
id: keyboard-and-focus-management-skip-to-content-link
title: A skip link that actually saves keyboard users time
category: accessibility
subcategory: keyboard-and-focus-management
tags: [skip-link, navigation, keyboard, landmarks]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A skip link is the first focusable element on the page and lets a keyboard
user jump past repeated navigation straight to the main content, avoiding a
tab-through of every nav item on every single page load.

- Make it the literal first element in the DOM inside `<body>`, before the
  header and nav, so it is the first Tab stop with no exceptions.
- Hide it visually by default (off-screen, not `display: none`) and reveal
  it with a visible, high-contrast style on `:focus` — it must be readable,
  not just present, when a sighted keyboard user tabs to it.
- Point it at a real, focusable target: `<main id="main-content"
tabindex="-1">`, and move focus there on activation so subsequent Tab
  presses continue from inside main content, not from the top of the page.
- Add more than one skip target on pages with several major regions (skip to
  search, skip to results) rather than forcing one giant nav past.
- Re-verify it after every nav redesign — skip links silently break when the
  target id is renamed or the nav gets wrapped in a new container.

Why: without it, a screen reader or keyboard-only user must tab through
every top-level nav link, every time, on every page, just to reach the
content that changes — a cost sighted mouse users never pay since they click
straight past the header.

Example: `<a class="skip-link" href="#main-content">Skip to main content</a>`
as the first child of `<body>`, styled to slide into view on focus.

Counter-example: a skip link present in markup but styled with `display:
none` — it is invisible to sighted keyboard users when focused and some
screen readers skip elements hidden this way entirely, making the link
functionally absent.
