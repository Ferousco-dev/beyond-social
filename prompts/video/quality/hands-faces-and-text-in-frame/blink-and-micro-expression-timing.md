---
id: hands-faces-and-text-in-frame-blink-and-micro-expression-timing
title: Blink rate and micro-expression timing
category: video-quality
tags: [faces, blinking, micro-expression, uncanny-valley]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The two most common ways generated faces read as fake are opposite failures:
either the face never blinks and stares like a mannequin, or it blinks and twitches
too often in a jittery, over-animated loop. Naming a natural blink cadence in the
prompt steers away from both.

What to specify:

- State a blink happens roughly once every 3-5 seconds for a resting or listening
  face, closer to once every 2-4 seconds when speaking (people blink more while
  talking than while still).
- Ask for a natural blink duration: eyes closed for roughly a third of a second,
  not an instant flicker and not a slow fade.
- Avoid asking for "expressive" or "animated" faces as a blanket descriptor; name
  one specific micro-expression instead, like a slight brow raise on emphasis or
  a small asymmetric mouth corner lift, and let the rest of the face stay settled.
- For any shot over 3 seconds, explicitly note at least one blink should occur;
  models default toward zero blinks unless prompted, which is the single biggest
  giveaway of synthetic footage in a still-camera talking shot.
- Don't stack blinking with a big head turn or hand gesture in the same beat;
  isolate it so the model has fewer simultaneous facial changes to track.

Why: human blink rate and duration are so consistent across cultures and contexts
that viewers register deviations from it subconsciously, even without being able
to name what looks wrong; it's one of the fastest tells for AI-generated faces.

Example: "resting expression, one natural blink around the two-second mark,
subtle brow raise on the word 'ready.'"
Counter-example: "highly expressive, constantly animated face" — with no anchor,
the model either freezes into a blinkless stare or flickers through expressions
too fast to read as human timing.
