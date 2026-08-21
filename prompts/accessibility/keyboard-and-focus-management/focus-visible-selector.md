---
id: keyboard-and-focus-management-focus-visible-selector
title: Using :focus-visible instead of :focus for indicators
category: accessibility
subcategory: keyboard-and-focus-management
tags: [focus-visible, css, mouse-vs-keyboard, indicators]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, landing-page, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A focus ring that appears on every mouse click looks broken to sighted mouse
users; `:focus-visible` shows the ring only when the browser infers keyboard
or other non-pointer interaction, which is what actually needs it.

- Style indicators with `:focus-visible`, not bare `:focus`, on every
  interactive element: `button:focus-visible { outline: ... }`.
- Keep a `:focus` fallback only for browsers old enough to lack
  `:focus-visible` support, and make sure it degrades to the same ring, not
  to nothing.
- Do not suppress `:focus-visible` on custom components with
  `-moz-focusring`/vendor hacks to "clean up" the look — the heuristic
  already handles mouse clicks correctly; overriding it re-breaks keyboard
  visibility.
- For components that manage focus programmatically (a search box that
  autofocuses on page load), be aware `:focus-visible` may or may not fire
  depending on how focus was triggered — verify the actual ring shows up
  after a real Tab press, not just in devtools' forced-state inspector.
- Never use `:focus-visible` as an excuse to make the ring subtler than the
  contrast rules require — it changes when the ring shows, not how strong it
  needs to be.

Why: before `:focus-visible` existed, teams solved the "ugly ring on click"
complaint by removing `outline` globally, which also removed it for keyboard
users — the selector fixes the actual mouse-click complaint without breaking
keyboard accessibility as a side effect.

Example: `.card-action:focus-visible { outline: 2px solid var(--accent-9);
outline-offset: 2px; }` — clicking the card with a mouse shows no ring,
tabbing to it does.

Counter-example: `.card-action:focus { outline: none; } .card-action:hover {
box-shadow: 0 0 0 2px var(--accent-9); }` — this removes the keyboard
indicator entirely and substitutes a hover effect that a keyboard-only user
never triggers.
