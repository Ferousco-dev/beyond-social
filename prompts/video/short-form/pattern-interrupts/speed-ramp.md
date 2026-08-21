---
id: pattern-interrupts-speed-ramp
title: Speed ramps tied to a physical event
category: short-form
subcategory: pattern-interrupts
tags: [pattern-interrupt, editing, motion, speed-ramp]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Shifting playback speed mid-shot, real time sliding into slow motion or the
reverse, breaks the rhythm prediction a viewer builds within the first second
of watching continuous motion, without requiring a cut at all.

- Ramp over roughly 0.3-0.5s rather than switching speed instantly.
- Tie the ramp's start to a physical event already in frame: an impact, a
  catch, a turn, a release, so the speed change reads as emphasis on
  something rather than an arbitrary effect.
- Scale motion blur to match the new frame rate; real cameras blur less per
  frame as they slow down, and blur that stays constant across the ramp is
  an immediate tell of digital manipulation.
- Limit to one ramp per five seconds of runtime so it stays a deliberate
  accent rather than the video's default gear.
- When generating footage rather than filming it, prompt for the blur and
  shutter behavior explicitly rather than trusting the model's default,
  since flat, blur-free slow motion is one of the most common tells of
  synthetic video.

Why: continuous motion lets the visual system extrapolate where things are
headed a fraction of a second ahead of the frame; a sudden change in that
rate violates the extrapolation and forces re-attention, the same mechanism
a real editor exploits with a bullet-time or ramp-to-freeze shot.

Example: "real-time walk into frame, ramping to 50% speed over 0.4s exactly
as the hand touches the product, motion blur scaled down to match the slower
shutter angle."

Counter-example: an instant cut from full speed to 20% speed with motion blur
left unchanged. Motion turns strobe-like and juddery, which reads as a
dropped frame rate rather than an intentional ramp.
