---
id: model-infinitetalk-lipsync-micro-head-motion
title: Small head motion carries more realism than big gestures
category: video-prompting
subcategory: head-movement
tags: [infinitetalk, head-motion, stillness, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ad-creative, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The most convincing talking-avatar motion is small: a few degrees of nod, tilt,
or lateral sway tied to speech rhythm, not a dramatic head turn. Static avatars
read as puppets; over-animated ones read as bobbleheads. Both are equally fake,
just in opposite directions.

- Prompt for motion in degrees of intent, not degrees of angle: "a slight nod
  on emphasized words, gentle head sway between phrases," rather than a raw
  rotation value the model has to interpret.
- Anchor big head motion to sentence stress: a small downward nod tends to
  land on emphasized syllables in real speech, an upward tilt often opens a
  question.
- Keep amplitude proportional to shot scale: micro-motion reads on a tight
  close-up, but the same amplitude looks lifeless in a medium shot, which needs
  slightly more range to register at all.
- Avoid prompting "keep head still" as a literal instruction; a genuinely
  locked head is the artifact you're trying to avoid, not the fix for it.

Why: the vestibular and postural micro-adjustments that come from breathing
and vocal effort are constant in real speech and mostly involuntary; a head
that holds one exact position for a full sentence is a physical impossibility
for a real person, so the absence of motion is itself the tell.

Example: "gentle head sway between phrases, subtle nod on emphasized words,
motion stays small and continuous rather than snapping between poses."

Counter-example: "head completely still and locked to camera," which produces
a mannequin-with-moving-mouth effect that no amount of accurate lip-sync
recovers from.
