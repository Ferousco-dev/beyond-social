---
id: model-infinitetalk-lipsync-avoiding-mouth-flap-silence
title: Handling pauses so the mouth doesn't keep moving on silence
category: video-prompting
subcategory: mouth-sync-fidelity
tags: [infinitetalk, silence, pauses, mouth-flap]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A talking avatar that keeps flapping its mouth during a pause, or between
sentences, is one of the fastest tells of synthetic speech, because real
speakers close their mouths (or hold a natural shape) the instant sound stops.

- Feed true silence, not low-level room tone, into the gaps of the driving
  track; residual noise above the model's silence threshold gets interpreted
  as quiet speech and animated accordingly.
- Script in deliberate pauses rather than relying on natural gaps in a rushed
  read; a beat of silence before a key line lets the mouth settle to rest and
  makes the next word land harder.
- Ask for "mouth returns to a relaxed closed rest position between phrases"
  in the prompt so held pauses don't default to an open, frozen "ah" shape.
- Watch the tail of the clip specifically: many generations let the mouth
  keep drifting for a few frames after the last word before the video ends.

Why: mouth-flap on silence happens when the model's amplitude gate is set too
loose, or when the audio file itself never truly goes quiet; either way the
network has a nonzero signal to animate, so it produces nonzero motion, even
though a real mouth would be still.

Example: "true digital silence between sentences, mouth settles to a closed,
relaxed rest position during the pause before the next line."

Counter-example: leaving a bed of quiet hiss or ambient room tone under the
whole track "for realism," which keeps the mouth subtly twitching through every
pause and undercuts the realism it was meant to add.
