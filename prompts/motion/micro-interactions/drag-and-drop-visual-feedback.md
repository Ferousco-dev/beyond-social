---
id: micro-interactions-drag-drop-feedback
title: Drag-and-drop visual feedback
category: motion
subcategory: interaction-design
tags: [drag-and-drop, feedback, reordering]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A drag interaction needs three simultaneous visual signals, the dragged item, the
gap it left behind, and the current valid drop target, or users lose track of
where the item will actually land.

- Dragged element: reduce opacity to ~80-90%, add a drop shadow, and scale up
  3-5% on pickup. It should track the cursor or finger with zero positional lag;
  reserve easing for the scale-in on pickup only, never for the element's
  position while actively dragging.
- Leave a placeholder at the origin, a dashed outline or a ~40% opacity ghost of
  the item, rather than letting the list collapse and reflow the instant the drag
  starts.
- Highlight a drop zone's border or background only while the dragged item is
  currently over it, not all eligible zones at once; showing every valid target
  simultaneously is informative once but becomes visual noise during the drag
  itself.
- Show a "not-allowed" cursor over invalid targets and give them no highlight at
  all, so valid and invalid zones stay unambiguous at a glance.
- On drop, animate the element settling into its final position over ~150ms
  ease-out rather than snapping there instantly; the same applies to the origin
  gap closing.

Why: without the elevated, shadowed pickup state, users often can't tell whether
a drag actually registered versus a failed click. Without a placeholder at the
origin, the list underneath reflows on every frame of movement, which makes the
destination position feel unstable since everything else is also moving. The
drop-settle animation matters because it completes the physical metaphor: setting
something down takes a beat, it doesn't teleport.

Example: on pickup, `transform: scale(1.04); box-shadow: 0 8px 24px rgba(0,0,0,.18); opacity: .85;` tracking the pointer 1:1.

Counter-example: a dragged card that jumps directly to whatever slot the cursor is
nearest, with the list reflowing on every pixel of movement and no ghost left at
the origin. The whole list appears to shuffle continuously and it's unclear where
the card will actually end up until the finger lifts.
