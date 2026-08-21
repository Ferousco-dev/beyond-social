---
id: modals-and-overlays-backdrop-and-scrim
title: Backdrop and scrim design
category: component
subcategory: modals-and-overlays
tags: [modal, backdrop, scrim, visual-hierarchy]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The backdrop's job is to visually subordinate the page without hiding that it's still there: too light and the modal doesn't read as blocking, too dark or blurred and the user loses the spatial anchor of what they'll return to.

- Use a semi-transparent dark scrim, roughly 40-60% black in light mode and slightly lower in dark mode, rather than a solid color, so the page stays dimly legible underneath.
- Avoid heavy backdrop blur as the sole depth cue on content-dense screens; blur alone reads as "loading" as often as it reads as "behind a modal," so pair it with the dim.
- Render the scrim above all page content, including sticky headers and nav; a nav bar poking through the scrim breaks the sense that the whole page is inactive.
- Transition scrim opacity together with the modal instead of snapping it in; an instant hard cut reads as a layout glitch rather than an intentional layer.
- Reserve full-opaque, no-scrim takeovers for genuine full-screen modes like image viewers or editors, never for standard task modals.

Why: The scrim tells the eye that this layer is temporarily off-limits without erasing spatial memory of the page underneath. Get the balance wrong and users either try to interact with content that's too lightly dimmed, or forget what page they were on when a too-dark modal closes.

Example: "Backdrop: rgba(0,0,0,0.5), fades in over 150ms in step with the modal panel."
Counter-example: "Solid white backdrop with no transparency." It reads as a full page navigation rather than an overlay, so the sense of a return-to-previous-state is lost.
