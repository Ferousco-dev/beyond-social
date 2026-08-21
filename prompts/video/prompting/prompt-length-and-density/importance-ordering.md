---
id: prompt-length-and-density-importance-ordering
title: Ordering clauses by how much they determine the shot
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, ordering, prioritization]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Order prompt clauses by how much each one determines the shot's identity, most
important first, because early clauses anchor the model's read more reliably
than clauses added later in a long prompt.

- Lead with subject, action, and setting: what is on screen, what it is doing,
  where it is.
- Follow with camera: shot size, one movement, one lens characteristic.
- Follow with light: source, direction, quality.
- Put texture and mood words last — they are the first to get softened under
  length pressure, and that is acceptable because they carry the least weight.
- When a later clause conflicts with an earlier one, the earlier one usually
  wins; use that predictably instead of being surprised by it later.

Why: a prompt is read and conditioned on progressively, and clauses near the
front have more influence over the model's initial read of the scene before
that read gets adjusted by everything that follows. Putting mood or atmosphere
language before the actual subject and action means the model commits to a
feeling before it knows what the feeling is attached to, which produces
atmospheric footage that does not clearly depict the requested action.

Example: "Barista steams milk behind a counter, static medium shot, 50mm,
window light from camera-left, quiet late-morning cafe."
Counter-example: "Quiet late-morning cafe, warm mood, window light from
camera-left, 50mm, static medium shot, barista steams milk behind a counter" —
identical words, reordered so that by the time the model reaches the actual
subject and action, the budget that should have anchored composition was
already spent on atmosphere.
