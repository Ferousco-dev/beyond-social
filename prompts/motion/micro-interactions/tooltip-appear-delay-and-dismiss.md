---
id: micro-interactions-tooltip-timing
title: Tooltip appear delay and dismiss timing
category: motion
subcategory: interaction-design
tags: [tooltip, timing, hover, discoverability]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A tooltip's appearance should be gated by an intent delay, while its dismissal
should be nearly instant, because showing and hiding serve opposite purposes.

- Show delay: 400-700ms after the cursor enters the target. This filters out the
  cursor simply passing over the element on its way somewhere else.
- Dismiss on `mouseleave` within about 100ms, no lingering fade-out delay; a
  tooltip that stays visible after the cursor has moved on ends up floating over
  unrelated content.
- Once a tooltip has opened, subsequent tooltips triggered within roughly a
  1-second window (hovering across a toolbar of icons, for example) should skip
  the show delay entirely. The user has already demonstrated they're exploring,
  not passing through.
- Animate the reveal as a 100-150ms fade combined with a small 4px offset toward
  the target, not a bare opacity swap, so it reads as appearing from the element
  rather than materializing independently.
- Keyboard focus should trigger the tooltip immediately, without the hover show
  delay, since moving focus to an element is always a deliberate action, unlike a
  cursor passing over it.

Why: without a show delay, every icon a cursor crosses while moving across a
toolbar would flash its tooltip, producing a strobe of unwanted popups. The delay
exists to distinguish "passing by" from "pausing to look," but once that intent has
been established once, forcing the same delay on every subsequent hover in the same
session of exploration makes the interface feel like it's testing the user's
patience rather than helping them.

Example: show after 500ms hover; if another tooltip closed within the last 1000ms, show instantly.

Counter-example: a tooltip that appears instantly on `mouseenter` with a 700ms fade-out
delay on exit. Moving the cursor across a row of five icons triggers a flicker of five
overlapping tooltips, several still fading when the next one opens.
