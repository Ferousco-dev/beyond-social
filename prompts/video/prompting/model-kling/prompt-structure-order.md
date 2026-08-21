---
id: model-kling-prompt-structure-order
title: The subject-action-scene-camera order Kling parses most reliably
category: video-prompting
subcategory: model-kling
tags: [prompt-structure, prompt-engineering, syntax, ordering]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Kling's prompt parser weighs earlier clauses more heavily and treats the
prompt as roughly sequential instructions, so consistently ordering
information the same way produces more predictable results than free-form
description.

- Lead with the subject and its defining, fixed attributes, who or what, key
  visual identity, since this anchors what the model tries hardest to keep
  stable.
- Follow with the single primary action, stated as a continuous verb phrase,
  not a list of actions.
- Then the scene and setting detail: location, time of day, practical light
  sources.
- End with camera behavior, framing, movement, speed. Placing it last means
  it modifies the whole rather than competing with the subject description
  for attention early in the sequence.
- Keep the whole prompt to one or two sentences. Padding it with stacked
  adjectives dilutes the weight on the load-bearing nouns and verbs.

Why: like most text-conditioned diffusion models, Kling's text encoder gives
recency and position-dependent weight to tokens, so front-loading
identity-critical information and saving movement or style modifiers for the
end produces more consistent adherence than scattering the same information
in an arbitrary order.

Example: "a woman in a red wool coat walks slowly along a rain-wet sidewalk
at dusk, streetlights reflecting on the pavement, slow tracking shot from the
side."
Counter-example: "slow tracking shot, dusk, rain-wet sidewalk, red coat,
woman walking, reflections, streetlights" — same information as a stacked
list, with weaker, less predictable adherence to the woman as the
load-bearing subject.
