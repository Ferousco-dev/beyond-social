---
id: prompt-length-and-density-adjective-stacking
title: Adjective stacking dilutes instead of intensifying
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, adjectives, precision]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Piling synonyms onto one quality does not intensify it. It adds words the
model has to reconcile, and near-synonyms rarely mean exactly the same thing
inside the model's learned space.

- Use one word per quality, chosen precisely: "harsh" is not "dramatic" is not
  "moody" — decide which one you actually mean.
- If a single adjective feels insufficient, replace it with a concrete
  technical cue instead of adding a second adjective: not "very bright and
  harsh light" but "direct overhead sun, hard-edged shadows."
- Cut any modifier that is not doing distinct work; if two words in a row
  modify the same noun toward the same effect, one of them is redundant.
- Reserve emphasis for one or two words per shot. A prompt where everything is
  emphasized carries no priority signal at all.

Why: near-synonyms map to overlapping but not identical regions of what the
model learned during training, so stacking several of them nudges the output
in several slightly different directions at once. The visible result is not a
stronger version of one direction but a soft average across all of them,
which is exactly what reads as generic rather than specific.

Example: "Hard, directional light casting a sharp-edged shadow across the
wall."
Counter-example: "Beautiful, stunning, dramatic, gorgeous, professional
lighting" — five adjectives and zero information about direction, hardness,
or source, so the model falls back to its generic default for "nice light,"
which is the flat, shadowless look that reads as AI-generated.
