---
id: model-seedance-multi-shot-sequencing
title: Writing native multi-shot sequences in one Seedance generation
category: video-prompting
subcategory: model-seedance
tags: [seedance, multi-shot, editing, narrative]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Seedance can render several distinct shots with a real cut between them inside a
single generation, which most video models cannot do reliably, so use this
instead of stitching separate clips together for anything under about ten seconds.

The recipe:

- Write each shot as its own sentence, in shot order, separated by explicit
  transition language: "Cut to," "Then," "The camera cuts to a close-up of."
- Keep the subject description worded identically across shots (same clothing,
  color, object phrasing) instead of re-describing it differently each time.
- Limit to two or three shots per generation; a fourth shot usually gets
  compressed or dropped entirely.
- Give each shot a distinct framing (wide, then close-up) so the cut reads as a
  real edit rather than a jump cut on the same shot size.

Why: because the whole clip comes from one generation pass, explicit cut markers
and shot-size changes let the model allocate frames to each beat instead of
dissolving them together, and identical subject wording keeps the embedding
stable enough that the subject doesn't visibly change appearance across the cut.

Example: "Wide shot: a barista steams milk behind the counter. Cut to a close-up
of the milk pitcher swirling as she pours latte art."

Counter-example: "A barista makes coffee, then the drink is finished and someone
drinks it happily" — no shot sizes, no cut marker, so Seedance renders it as one
continuous blurred motion instead of two distinct shots.
