---
id: prompt-length-and-density-reference-stacking-limit
title: Cap style references before they average out
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, style-reference, consistency]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Naming more than one or two style or reference cues in a single prompt,
director names, film stocks, aesthetic movements, causes the model to blend
them into a compromise that resembles none of them clearly.

- Cap style references at one dominant cue plus, if needed, one supporting
  technical cue, for example one director-style reference and one film-stock
  reference.
- Choose references at different levels rather than the same level, to avoid
  direct competition: a mood reference like "Edward Hopper's isolation" pairs
  better with a technical reference like "Kodak Portra color response" than
  two mood references pair with each other.
- If two references are pulling in different visual directions, treat that
  as a decision to make yourself, not something to hand to the model by
  stacking both in.
- Translate references into concrete visual attributes when possible, light
  quality, color palette, grain, rather than relying on the model's often
  thin interpretation of a name.

Why: a named reference is compressed shorthand for many visual attributes at
once, and stacking several compressed bundles forces the model to average
across all of them simultaneously. It lands on a generic midpoint that
carries none of any single reference's distinguishing traits, which is the
opposite of what a reference was invoked to do.

Example: "Muted, desaturated palette with the grain and slight warmth of
Kodak Portra 400 film stock."
Counter-example: "In the style of Kubrick, Malick, Fincher, and Roeg" — four
directors with meaningfully different visual languages, symmetry, natural
light, cool precision, jump-cut fragmentation, collapse into an indistinct
generic prestige-drama look because no single one is dominant enough to
actually shape the output.
