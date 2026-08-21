---
id: keyboard-and-focus-management-nested-overlay-focus-stack
title: Focus management when overlays stack on top of overlays
category: accessibility
subcategory: keyboard-and-focus-management
tags: [nested-overlays, focus-stack, dialog, popover]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A dialog that opens a dropdown, or a dialog that opens a second confirmation
dialog, needs an explicit stack, not a single "is there an overlay open"
boolean — the trap, the Escape handler, and the return-focus target all have
to track which layer is currently on top.

- Maintain a real stack (array), pushing on open and popping on close, not a
  single active-overlay reference — a single reference gets silently
  overwritten when a second overlay opens, losing track of the first.
- Trap focus to only the topmost layer at any time; the layer beneath a
  newly opened one should have its own trap suspended, not competing with
  the new one.
- Escape closes only the top of the stack and pops it; the return-focus
  target is the element that opened that specific layer, which is often a
  button inside the layer beneath it, not the original page trigger several
  levels down.
- `aria-hidden`/`inert` sibling-hiding must apply relative to each layer's
  own siblings, so a layer two levels deep does not accidentally hide layer
  one, which it is itself nested inside of.
- Cap nesting depth by design where possible (a confirmation dialog opened
  from a dialog is reasonable; a third level usually signals the flow
  should be restructured, not stacked further).

Why: each of the individual patterns — trap, Escape, return-focus — is
straightforward for one overlay, but they interact multiplicatively once
overlays nest, and a naive single-layer implementation breaks in ways that
only appear once a second overlay is opened during testing.

Example: a "select customer" dialog opens an "add new customer" dialog on
top; Escape in the top dialog returns focus to the "add new customer"
button inside the "select customer" dialog, not to the page behind both.

Counter-example: a global `let modalOpen = false` flag toggled by every
dialog — opening a second dialog while the first is open leaves the flag
true when either closes, so closing the second dialog also incorrectly
tears down the trap and hidden-sibling state meant for the first.
