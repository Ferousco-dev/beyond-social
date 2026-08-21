---
id: model-seedance-prompt-structure
title: Seedance's preferred prompt structure
category: video-prompting
subcategory: model-seedance
tags: [seedance, prompt-structure, syntax, natural-language]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Seedance parses full natural-language sentences more reliably than comma-separated
tag lists, unlike some other text-to-video models that reward keyword stacking.

The recipe:

- Lead with the subject and its immediate action in one clause.
- Follow with the environment or setting as a second clause.
- State camera behavior as an explicit clause ("the camera does X"), not just an
  adjective bolted onto the subject.
- Close with a short lighting or mood clause.
- Keep the whole prompt to two to four sentences; longer rarely adds fidelity,
  it adds noise the model has to average out.

Why: Seedance's text encoder was almost certainly tuned on caption-style training
data, full sentences describing real footage rather than keyword tags, so it maps
action verbs and camera clauses to actual motion far more reliably than it maps
disconnected nouns. Tag soup gives the model nothing to anchor motion to, so it
tends to average the tags into a static, illustrative frame instead of a moving
scene.

Example: "A line cook plates a bowl of noodles under the pass light. The camera
pushes in slowly from a low angle as steam rises off the bowl. Warm tungsten
light, shallow depth of field."

Counter-example: "noodles, chef, kitchen, steam, cinematic, 4k, dramatic
lighting, bokeh" — this gives the model no verb and no camera clause to work
from, so it defaults to a slow static push with generic sheen regardless of what
was listed.
