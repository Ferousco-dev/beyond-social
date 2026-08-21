---
id: handheld-vs-stabilized-shake-dosage
title: Calibrate handheld amplitude to framing, not a fixed dose
category: camera-movement
subcategory: calibration
tags: [dosage, amplitude, calibration, handheld]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Handheld amplitude has a narrow usable band per context: too little reads as
faking UGC, too much becomes illegible or nauseating on a small phone screen,
and the right dose depends heavily on subject distance.

- Wide or establishing shots tolerate more visible shake; the subject is small
  on screen and the motion is easy to parse against the whole frame.
- Close-ups and product inserts need the shake dialed down sharply, because at
  close framing the same angular hand tremor translates into a much larger
  apparent pixel displacement.
- Shots under two seconds barely register shake at all; save real handheld
  texture for beats that hold three seconds or longer.
- Describe amplitude relative to context, "just enough handheld texture to feel
  unrigged, not enough to distract from the label," rather than an absolute
  instruction the model overshoots on.

Why: shake amplitude and subject framing interact multiplicatively. The same
physical hand tremor looks subtle on a wide shot and violent on a macro insert,
so a single blanket "handheld, shaky" instruction applied across a cut sequence
with mixed framings produces wildly inconsistent, sometimes unwatchable results.

Example: "wide establishing shot: natural handheld sway; product insert two
shots later: shake reduced to a bare minimum, nearly still."
Counter-example: applying the same "handheld, shaky" instruction to both a wide
shot and a macro close-up — the close-up turns into an unreadable blur.
