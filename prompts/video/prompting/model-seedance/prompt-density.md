---
id: model-seedance-prompt-density
title: How much detail Seedance can actually use per shot
category: video-prompting
subcategory: model-seedance
tags: [seedance, prompt-length, specificity, dilution]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

There's a ceiling on how many distinct descriptive attributes Seedance will
actually honor in one generation. Past roughly six to eight concrete details,
added description stops adding fidelity and starts diluting the details that
matter most.

The recipe:

- Rank details before writing: subject action and camera move are
  load-bearing and belong first; secondary texture or mood details come last
  and are the first to get dropped if the prompt runs long.
- One adjective per noun, not a stack — "a worn leather jacket" holds, "a
  worn, faded, cracked, vintage leather jacket" gets averaged into a vaguer,
  generic jacket.
- If a shot needs a lot of specific detail (a period setting, a branded
  environment), split it across image conditioning rather than trying to
  text-describe every element.
- Cut adverbs that don't change motion ("gracefully," "elegantly") — they add
  no signal the model can act on and take weight away from verbs that do.

Why: the text encoder has a fixed attention budget across the tokens in the
prompt, so every additional adjective competes with the ones that actually
drive composition and motion. A long, over-qualified prompt spreads that
budget thin, and the output regresses toward the model's generic defaults
rather than becoming more specific.

Example: "A cyclist in a red jacket rides down a wet cobblestone street at
dusk, camera tracking alongside at bike height."

Counter-example: "A cyclist in a vibrant, striking, eye-catching red jacket
rides gracefully and elegantly down a beautifully wet, gleaming, atmospheric
cobblestone street at a stunning dusk" — the load-bearing details get buried
under redundant modifiers.
