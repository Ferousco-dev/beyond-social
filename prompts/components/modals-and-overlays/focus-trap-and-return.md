---
id: modals-and-overlays-focus-trap-and-return
title: Focus trapping and focus return in modals
category: component
subcategory: modals-and-overlays
tags: [modal, accessibility, keyboard, focus-management]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.92
---

A modal must trap keyboard focus inside itself while open and return focus to the exact element that opened it when it closes, or keyboard and screen-reader users lose their place entirely.

- On open, move focus to the modal's first interactive element or its heading; if the first control is destructive, focus the heading instead so a stray Enter can't trigger it.
- Tab and Shift+Tab must cycle only within the modal's focusable elements; focus should never land on page content hidden behind the backdrop.
- Set aria-modal="true" and role="dialog" (or "alertdialog" for confirmations) with aria-labelledby pointing at the visible title, so assistive tech announces it correctly.
- On close, through any dismissal path, return focus to the triggering element, not to document.body; losing focus to the body forces screen-reader users to re-navigate the whole page.
- Mark background content inert or aria-hidden while the modal is open so screen readers don't read through it.

Why: Sighted mouse users take focus management for granted because their eyes do the work a focus ring does for keyboard and screen-reader users. Skip it and those users can tab into invisible page content, trigger hidden actions, or never find their way back to where they started. This is a correctness bug, not a nice-to-have, and most accessibility audits fail products here first.

Example: "On modal close, programmatically call .focus() on the button that opened it."
Counter-example: "Modal closes and focus silently resets to <body>." A screen-reader user hears nothing, doesn't know the modal closed, and has to re-explore the page from the top.
