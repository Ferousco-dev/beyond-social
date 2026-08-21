---
id: troubleshooting-common-failures-dead-eyed-gaze-and-blink-failure
title: "Symptom: the subject's eyes look dead, unblinking, or fixed"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [eyes, gaze, blink, uncanny, talking-avatar]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Symptom: a human subject holds a fixed, glassy stare at the lens for the
whole clip, with no blinking or with blinks that look mechanical and evenly
timed. Viewers read this as "off" before they can say why, because human eyes
never behave that way.

- Ask for the behavior, not just the feature: "natural blinking, occasional
  glances away from the lens and back" beats leaving eye behavior unspecified,
  which tends to default to a locked stare.
- Break the eye-contact lock: a subject that occasionally looks slightly
  off-camera (down while thinking, aside while recalling something) reads as
  present and alive; unbroken lens contact for 5-10 seconds reads as a render.
- Keep eyes in a frame large enough to show them clearly (medium or medium-
  close) — in very wide shots, eye behavior is invisible and irrelevant, so
  don't spend prompt budget on it there.
- Pair with a slight head micro-movement; eyes that move but a head that is
  perfectly locked-off look like a mask, since real gaze shifts are usually
  accompanied by tiny neck and head adjustment.
- If the model persists in a stare, shorten the shot; the failure compounds
  the longer a held take runs, so three fixed seconds is more forgivable than
  ten.

Why: blink rate and micro-saccades are so consistent in human video (roughly
every 2-6 seconds, never perfectly periodic) that their absence is one of the
strongest uncanny-valley signals available, and it's cheap to correct by
naming the behavior explicitly.

Example: "medium shot, natural blinking, she glances down briefly then back
up to camera as she speaks."
Counter-example: "looking directly at camera the entire time" with no blink
or gaze-break instruction, which invites a locked, glassy stare.
