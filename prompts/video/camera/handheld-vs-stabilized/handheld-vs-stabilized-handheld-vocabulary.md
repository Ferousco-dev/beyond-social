---
id: handheld-vs-stabilized-handheld-vocabulary
title: Precise vocabulary for handheld techniques
category: camera-movement
subcategory: vocabulary
tags: [vocabulary, handheld, terminology, direction]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

"Handheld" alone is a single scalar, shaky or not. Naming the actual technique a
crew would reach for gives the model a specific rig and operator behavior to
reproduce, not a generic wobble.

- Shoulder rig: heavier, lower-frequency sway, stable enough to hold a shot but
  never glassy; the standard for documentary interviews and walk-and-talks.
- Run-and-gun: fast, reactive handheld with visible mid-shot reframing as the
  operator chases the action; news and vlog energy.
- Whip pan: a fast, motion-blurred handheld pan used as a transition between two
  subjects, not as a way to hold a frame.
- Crash zoom: an abrupt handheld push, often paired with a small stumble and
  correction on landing; comedic or urgent tone.
- POV grip: camera at eye or chest height with the operator's own gait embedded,
  for found-footage or first-person framing.

Why: real crews choose a specific rig and operator behavior for a specific
emotional register, not a generic "shaky" setting. Naming that rig steers the
model toward the right amplitude, frequency, and framing behavior instead of
defaulting to uniform high-frequency jitter that reads as low-budget rather than
intentional.

Example: "shoulder-rig handheld, walk-and-talk pace, gentle sway, no whip pans."
Counter-example: "shaky handheld camera" — underspecified, so the model defaults
to constant jitter with no rig-specific character at all.
