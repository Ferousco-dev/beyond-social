---
id: modals-and-overlays-motion-choreography
title: Modal entrance and exit motion
category: component
subcategory: modals-and-overlays
tags: [modal, motion, animation, transition]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A modal's entrance and exit motion should describe where it came from and where it's going, spawned from the trigger and returned to the trigger, not just fade in centered on the screen as if from nowhere.

- Scale or translate the modal in from a point near its trigger, or from the bottom edge on mobile, rather than a plain center-screen fade, to preserve spatial continuity with the click that opened it.
- Keep the open transition under roughly 200ms and the close under 150ms; closing should feel quicker than opening, since the user is done and wants out.
- Animate the backdrop and modal body as a pair with a slight offset, backdrop starting a beat before the panel, rather than as two unrelated fades.
- Use an ease-out curve for entrance and ease-in for exit; a linear curve on either reads as mechanical.
- Respect prefers-reduced-motion by falling back to a straight opacity crossfade under 100ms, never to an instant hard cut, which can read as a broken render.

Why: Motion here does real information work: it tells the eye that this new panel is causally connected to the thing just clicked, not an unrelated pop-up. Skipping that connection, or over-animating a task modal with a bounce or spring, makes the interface feel like a generic template rather than a considered product.

Example: "Modal scales from 0.96 to 1 and fades in over 180ms ease-out; backdrop fades in over 220ms starting 20ms earlier."
Counter-example: "Modal springs in with an elastic bounce overshoot." The playful overshoot suits a game or celebratory moment, not a settings panel, and reads as unintentional jitter in a professional tool.
