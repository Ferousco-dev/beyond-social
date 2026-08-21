---
id: motion-verbs-and-physicality-verb-precision
title: Choose the verb that already contains the physics
category: video-prompting
subcategory: motion-verbs
tags: [verbs, precision, physicality, prompting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

English has hundreds of motion verbs, and each one already encodes speed, effort,
and manner. Picking the right one does more prompting work than a generic verb
plus a pile of adjectives ever will.

The recipe:

- Replace "walks" with the verb that fits the character and mood: shuffles,
  strides, ambles, marches, totters.
- Replace "moves the cup" with the actual manipulation: picks up, slides, nudges,
  sets down, knocks over.
- Run a quick test: could this verb describe a forklift doing the same motion? If
  yes, it is too generic, keep hunting.
- Prefer one strong verb over a verb-plus-adverb stack. "Quickly moves" becomes
  "darts." "Slowly moves" becomes "creeps."

Why: generation models attend more reliably to a single concrete token than to
adjectives layered onto a vague verb. A precise verb front-loads manner, speed,
and effort into one token the model has strong, consistent priors for, which
means less of the shot is left to the model's default interpretation. That
default is almost always the flat, weightless, medium-speed motion that reads as
generic AI video. Verb precision is the cheapest lever available for fighting it.

Example: "she scoops the keys off the counter without breaking stride."
Counter-example: "she quickly grabs the keys and moves toward the door" — a
generic verb carrying two bolted-on adverbs. The model has no single physical
pattern to match, so it averages toward flat, unremarkable motion.
