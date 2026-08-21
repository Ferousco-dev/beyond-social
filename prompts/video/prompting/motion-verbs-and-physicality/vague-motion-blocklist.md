---
id: motion-verbs-and-physicality-vague-motion-blocklist
title: The vague-motion blocklist
category: video-prompting
subcategory: motion-verbs
tags: [vague-language, anti-pattern, verbs, motion]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A short list of words consistently produces generic motion because they carry no
manner information. Treat them as a blocklist during prompt review, not just
words to avoid on a first draft.

The blocklist and fixes:

- Ban placeholder verbs: moves, goes, does something with, is active, interacts
  with, engages with.
- Ban modifier-only descriptions that skip the actual verb: "moves smoothly,"
  "naturally sits," "gracefully turns."
- Replace every hit with a verb borrowed from a real domain vocabulary: sports
  (pivots, plants), trades (cranks, tightens), dance (sweeps, coils), animation
  (settles, overshoots).
- If you cannot name the specific verb for an action, you do not actually know
  what happens in the shot yet. Stop and decide before prompting.

Why: a generic motion verb gives the model nothing to anchor to except its
training-average motion for "a person doing a thing," which is exactly the flat,
hovering, slightly-too-smooth quality audiences now recognize as synthetic. Every
instance of "moves" or "interacts with" in a prompt is a small vote for that
average. A blocklist forces the rewrite before the generation, which is far
cheaper than trying to fix floaty motion after the fact.

Example: "he clocks the door, then bolts for it."
Counter-example: "he notices the door and moves toward it quickly" — passes a
casual read but fails the blocklist; "moves" produces a generic glide rather than
a run, no matter what adverb is bolted onto it.
