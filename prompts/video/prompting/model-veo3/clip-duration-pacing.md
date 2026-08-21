---
id: model-veo3-clip-duration-pacing
title: Budget the action for the clip's fixed short duration
category: video-prompting
tags: [duration, pacing, timing, clip-length]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Veo 3 clips run a fixed short duration by default, around 8 seconds. The
prompt's action needs to fit that budget; describing a scene that needs
thirty seconds to unfold forces the model to compress or rush it.

Practice:

- Budget one primary action per clip: a walk to a door, a hand reaching for a
  cup, a car pulling into frame, not a whole sequence of errands.
- For a slow, contemplative move (a push-in, a held reaction), leave room for
  the shot to breathe: less action, not more, produces a stronger 8 seconds.
- For dialogue clips, budget roughly one short line or exchange per clip. A
  longer conversation needs to be split across multiple generations and cut
  together, not compressed into a single take.
- When a longer sequence is needed, plan it as a series of individual clips
  ahead of time (an intro shot, an action shot, a reaction shot) rather
  than trying to cram the whole beat into one generation and hoping it paces
  itself.

Why: a fixed short duration is a hard constraint, like a real single take's
runtime. Over-describing action for the runtime forces the model to speed up
or truncate motion unnaturally, which reads as one of the more visible
"sped-up AI video" tells rather than a deliberate edit.

Example: "8 seconds: she picks up the mug, blows on the coffee once, takes a
sip." Three small beats, fits comfortably.
Counter-example: "she makes coffee, walks to the table, sits down, checks her
phone, then answers a call." Five beats crammed into one clip, forcing
unnaturally fast, jittery motion to fit the time.
