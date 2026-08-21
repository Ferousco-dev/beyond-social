---
id: pattern-interrupts-whip-pan-transition
title: Whip pan as a scroll-reset transition
category: short-form
subcategory: pattern-interrupts
tags: [pattern-interrupt, camera-move, transition, editing]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A fast whip pan, the motion-blurred swing of a camera from one framing to another,
cut at its peak blur, physically mirrors the swipe gesture a viewer's thumb is
already making, hijacking that motion into the video instead of past it.

- Place the first whip inside 1.5-3s, then repeat every 4-6s only if retention
  data shows a drop at that mark; do not use it on a metronome.
- Match exit blur direction of shot A to the entry blur direction of shot B so
  the eye doesn't have to reorient mid-cut.
- Cut on the single most blurred frame, never a frame before or after it, or a
  clean "settle" frame will leak through and reveal the seam.
- Keep the pan itself under ~200ms of travel; slower reads as camera drift, not
  an interrupt.
- Vary whip speed by a few percent shot to shot; a perfectly identical pan
  every time reads as a template wipe, not handheld camera work.
- Sync a whoosh sound effect so its peak amplitude lands on the cut frame, not
  before or after it.

Why: the brain treats sudden large-scale motion blur as a physiological
reorienting cue, the same reflex that makes you glance at a car swerving in
your peripheral vision. Matching blur direction across the cut keeps that
reflex working for you instead of confusing the eye with two unrelated blurs.
An interrupt that fires on a fixed schedule stops surprising anyone, so vary
timing and pan speed shot to shot.

Example: "fast whip pan left, heavy motion blur, hard cut on peak blur frame
into interior kitchen shot, whoosh sfx peaking exactly on the cut."

Counter-example: a smooth half-second pan with no motion blur and a gentle
ease-out. It reads as ordinary camera movement, not an interrupt, and a
perfectly linear ease-out on top of that is a tell that the shot was rendered
rather than shot.
