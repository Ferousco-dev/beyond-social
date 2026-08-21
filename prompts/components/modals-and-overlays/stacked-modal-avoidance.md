---
id: modals-and-overlays-stacked-modal-avoidance
title: Avoiding stacked and nested overlays
category: component
subcategory: modals-and-overlays
tags: [modal, stacking, nested-overlays, navigation]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A modal opening another modal is almost always a sign the flow should be re-architected, not stacked; each layer compounds the focus-trap, backdrop, and return-state problems of the one below it.

- If a task inside a modal needs another decision, replace the modal's content in place, as a wizard step or slide-over, instead of layering a second overlay on top.
- Where a secondary decision is genuinely unrelated, such as a destructive confirmation started inside a form modal, allow at most one additional layer, rendered as an alertdialog above the first modal's own backdrop rather than a second independent scrim.
- Closing the top layer must always return focus and state to the layer beneath, never all the way to the base page.
- Never let a stacked modal be wider or taller than the one beneath it; the visual hierarchy must shrink inward or it looks like a mis-ordered stack.
- If a flow keeps needing new layers, treat that as the signal to convert it into a dedicated full-page flow instead of a modal.

Why: Every additional modal layer multiplies the accessibility and state-management surface, two focus traps, two escape bindings, two backdrops, for a marginal gain that users mostly experience as confusion over which cancel button does what. Products that avoid stacking tend to have simpler bug surfaces around exactly this feature.

Example: "Delete confirmation inside an edit-record modal renders as a small alertdialog centered above the existing modal's own backdrop, one layer only."
Counter-example: "Clicking 'Add address' inside a checkout modal opens a second full-screen modal with its own backdrop and close button." Two independent overlay systems now compete for Escape and backdrop-click, and closing the wrong one loses the user's checkout progress.
