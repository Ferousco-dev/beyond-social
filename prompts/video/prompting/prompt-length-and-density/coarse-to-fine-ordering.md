---
id: prompt-length-and-density-coarse-to-fine-ordering
title: Structural facts before texture, in every prompt
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, ordering, composition]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Describe a shot the way a director blocks it: wide structural facts first,
fine texture last, because that ordering matches how a generation model
actually assembles a scene, from composition outward to detail.

- Order clauses: shot type and framing, then subject and action, then
  setting, then light, then camera behavior, then fine texture and
  atmosphere.
- Never lead with texture or mood words ("gritty," "cinematic") before the
  model knows what is actually in the frame.
- Treat each clause as narrowing the previous one, not as an independent tag
  dropped into a list.
- If the coarse facts, what is happening and where, cannot be stated cleanly
  in one sentence before adding modifiers, the shot itself is not defined yet;
  fix that first.

Why: structural facts fix the scene's skeleton, and modifiers only make sense
relative to that skeleton. Introducing modifiers before the skeleton exists
gives the model nothing specific to attach them to, so they get applied
generically across the whole frame instead of to the particular element they
were meant to describe.

Example: "Wide static shot of a mechanic under a car on a lift, fluorescent
shop light overhead, grease-stained coveralls, faint tool clatter off-frame."
Counter-example: "Gritty industrial mood, grease-stained coveralls,
fluorescent light, a mechanic under a car" — texture and mood arrive before
the frame is established, so they end up describing nothing in particular and
often surface as an unmotivated color grade instead of grounded detail.
