---
id: prompt-length-and-density-emphasis-through-position
title: Emphasize by moving a cue earlier, not repeating it
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, emphasis, syntax]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

To emphasize a quality, move it earlier in the prompt or make it more
specific. Do not repeat the same word, because repetition mostly adds length
without reliably increasing its weight in current video models.

- To raise a quality's importance, promote it toward the front of the
  sentence rather than restating it at the end.
- Replace a repeated adjective with an escalating concrete detail: instead of
  "dark, very dark, extremely dark," specify the actual light source that is
  missing, "only a sliver of light under the door."
- If a term genuinely needs mechanical emphasis and the tool supports a
  weighting syntax, use that syntax once rather than manual repetition.
- Verify the emphasis worked by generating and checking, not by assuming more
  repetition equals more effect.

Why: repeating a word does not add new information for the model to act on,
it consumes prompt budget restating something already stated. Moving a cue
earlier changes how much of the model's limited attention lands on it before
other clauses compete for that same attention, which is a mechanism that
actually shifts output, unlike simple repetition.

Example: "Near-total darkness broken only by a strip of hallway light under
the door, a figure barely visible."
Counter-example: "Dark, dark room, very dark, so dark, pitch black" — five
attempts at the same idea that add length without adding the concrete detail,
what light source, how much, from where, that would actually produce a
darker-reading image.
