---
id: reference-image-conditioning-economy-of-instruction
title: Prompting only what the reference cannot already show
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, prompt-economy, instruction-hierarchy, minimalism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The shortest effective image-to-video prompt describes only what the reference
cannot show — motion, duration of action, and any state change — because
everything else is already fully specified by the pixels, and re-describing it
adds noise without adding control.

- Write the prompt as a delta from the still: what starts moving, what changes,
  in what order, not a full scene description that repeats the image.
- Budget prompt length around the number of distinct events in the shot; one
  clear action gets one clear clause, a five-clause prompt for a one-action shot
  usually means most of those clauses are restating the image and diluting the
  one that matters.
- Cut adjectives that describe static appearance (color, material, styling)
  unless a specific attribute is drifting in tests and needs reinforcing; add it
  back surgically rather than pre-emptively over-describing everything.
- Order clauses by causality and time when there are multiple beats; the model
  treats prompt order as a loose timeline cue, and events out of narrative order
  can generate out of sequence.

Why: every token in the prompt is a claim the model has to reconcile against the
reference pixels; redundant claims that match the image cost nothing when
they're accurate, but they also do nothing useful, and they crowd out attention
that should go to the few tokens actually describing new information — in
practice this shows up as motion that's less specific or less confident than a
tighter prompt produces for the same reference.

Example: reference already shows a barista behind an espresso machine; full
prompt: "steam rises from the portafilter, barista glances up toward camera,
holds for a beat."

Counter-example: "a barista in a green apron behind a shiny espresso machine in
a cozy cafe, steam rising, warm lighting, glances at camera" for an image
already showing all of that; the redundant clauses don't reinforce anything and
the one new instruction (glance at camera) gets no more weight than the
restated ones.
