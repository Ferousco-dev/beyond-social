---
id: prompt-length-and-density-single-sentence-rule
title: Relational sentences over disconnected tag lists
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, syntax, structure]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A prompt written as one flowing sentence with clauses in causal or spatial
relation to each other outperforms the same information written as a
disconnected list of comma-separated tags, because the relationship between
clauses is itself information.

- Use connective language, "as," "while the light falls across," "just
  before," to show how clauses relate, not merely that they co-occur.
- Reserve tag-list style, keyword, keyword, keyword, for style and technical
  shorthand only, camera stock, aspect ratio, grain, not for scene content.
- A relational sentence naturally enforces ordering and helps avoid
  contradiction, because it is hard to write a grammatically coherent
  sentence that contradicts itself.
- Read the prompt aloud. If it does not parse as an instruction you could
  give a camera operator, it will not parse cleanly for the model either.

Why: tag lists give the model co-occurrence without relationship, so it has
to guess how a "harsh light" tag relates to a "handheld camera" tag sitting
next to it. A sentence encodes that relationship directly, closer to how the
model's own language training represents scenes, which is why relational
prompts tend to produce more coherent staging.

Example: "As the train pulls away, a woman presses her hand to the window,
the platform lights streaking past behind her in a slow handheld pan."
Counter-example: "train, woman, window, hand, platform lights, streaking,
handheld, pan, slow, sad" — the same nouns and modifiers with all relational
information stripped out, leaving the model to guess whether the woman is
streaking, the lights are sad, or the pan is on the window.
