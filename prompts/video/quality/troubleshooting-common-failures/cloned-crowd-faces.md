---
id: troubleshooting-common-failures-cloned-crowd-faces
title: "Symptom: background crowds show visibly repeated, cloned faces"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [crowd, background, extras, duplication]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Symptom: a street, cafe, or event scene populates its background with
extras, and several of them are recognizably the same person, same face,
same outfit, repeated at different points in the crowd. One duplicated
background face is enough to break the illusion of a real crowd.

- Keep crowds out of sharp focus: a shallow depth of field that puts
  background people softly out of focus hides the repetition that reads as
  obviously duplicated when sharp.
- Reduce crowd density in the prompt: "a few people in the background" or
  "a handful of pedestrians" generates fewer instances for the model to
  duplicate than "a busy, crowded street," which pushes toward filling space
  with repeated figures.
- Keep background people at a distance and moving, or with their backs
  partly turned; distant, non-frontal figures make repeated features far
  less noticeable than clearly visible faces.
- Do not ask for a background crowd to be "diverse" or "varied" as the only
  instruction; that's a description the model can't operationalize per
  instance. Controlling density and focus does more than a diversity
  adjective ever will.
- If a scene genuinely needs a dense, filled crowd (a concert, a packed
  street), treat it as a wide establishing shot only, held briefly, rather
  than a shot where any single figure is on screen long enough for a
  viewer's eye to catch a repeat.

Why: the model has no persistent memory of "how many distinct people it has
already generated" within a frame, so a request for density without a check
on focus or distance is a direct invitation to duplicate; controlling how
much scrutiny the crowd receives is more reliable than trying to prompt
individual variation into existence.

Example: "quiet cafe, one or two people blurred in the background, shallow
depth of field."
Counter-example: "bustling crowded plaza full of diverse people" with the
crowd sharp and in focus across the whole frame.
