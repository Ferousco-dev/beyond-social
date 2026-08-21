---
id: keyboard-and-focus-management-avoiding-keyboard-traps
title: Avoiding unintentional keyboard traps outside modals
category: accessibility
subcategory: keyboard-and-focus-management
tags: [keyboard-trap, wcag, focus-management, third-party]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Any control that catches focus and will not release it back to normal Tab
flow is a keyboard trap, and WCAG treats it as a blocker regardless of how
minor the component looks — a rich-text editor or embedded widget is the
most common accidental source.

- Every custom widget that intercepts Tab (a rich-text editor capturing Tab
  for indentation, a code editor, a date picker grid) must define an
  explicit, documented escape: either Tab moves to the next page element
  after one press, or a documented alternate key does, and this must be
  communicated to the user (visually or via `aria-describedby`).
- Third-party embeds (an iframe'd payment widget, an embedded video
  player's custom controls) are a frequent unintentional trap source since
  you don't control their internal Tab handling — test them specifically
  after integrating, don't assume the vendor solved this.
- A `contenteditable` region that hijacks every keydown for its own
  shortcuts is especially risky — verify Tab and Shift+Tab still exit it in
  both directions.
- Distinguish this from an intentional modal trap: a modal trap is
  documented, expected, and paired with a clear close action; an
  unintentional trap has no exit and no indication one exists.
- Test with keyboard only, start to finish, on every new interactive
  component before shipping — this class of bug is invisible in a mouse-only
  QA pass and only appears when Tab is actually pressed through the flow.

Why: a keyboard trap does not just annoy a keyboard-only user, it can
strand them entirely with no way to proceed or go back without falling
back to the mouse or reloading the page, which for someone who cannot use a
mouse means being stuck.

Example: a rich-text editor toolbar where Tab moves from the editor content
into the toolbar's first button, and Tab again continues to the next page
element — Tab never gets consumed with no exit.

Counter-example: embedding a third-party calendar widget in an iframe where
internally Tab cycles endlessly within the calendar grid and never returns
focus to the parent page, with no visible way out except reloading.
