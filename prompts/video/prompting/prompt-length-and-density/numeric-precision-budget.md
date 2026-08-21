---
id: prompt-length-and-density-numeric-precision-budget
title: Numeric precision earns its place, or it is noise
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, precision, camera]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Numeric specifics, focal length, degrees of pan, frame rate, exact color
values, earn their place only when the number changes what a crew member
would actually do differently. Past that, numbers are length spent without
the model having any mechanism to hit them.

- Useful: focal length category (24mm versus 85mm changes compression and
  background blur meaningfully), frame rate intent (24fps cinematic versus
  slow motion), a rough pan or tilt direction.
- Not useful: exact degrees of camera angle, exact hex codes, seconds
  specified to the decimal — these read as precise but nothing in the
  pipeline can verify or hit them, so they cost length without adding
  fidelity.
- Prefer categorical precision, "a long lens compressing the background,"
  over numeric precision, "shot on an 87.5mm lens," when both would produce
  the same practical result.
- Reserve true numbers for duration and pacing, clip length, cuts per beat,
  where the generation pipeline can actually act on them.

Why: a number implies a tolerance the model was never built to hit, so
overly precise numeric language creates a false sense of control while
consuming prompt budget that would more reliably steer the output if spent on
lens category or light direction instead.

Example: "35mm lens, subject in the middle third of the frame, shallow depth
of field."
Counter-example: "Shot on a 41mm lens at f/1.8, camera tilted exactly 12
degrees, color temperature 5600K" — precise-sounding numbers the model cannot
verify or hit, spending prompt length on false precision instead of the
framing and light cues that actually shape the image.
