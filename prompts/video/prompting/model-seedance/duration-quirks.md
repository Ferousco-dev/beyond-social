---
id: model-seedance-duration-quirks
title: Seedance's 5s vs 10s duration behavior
category: video-prompting
subcategory: model-seedance
tags: [seedance, duration, pacing, generation-length]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Seedance's two standard durations, roughly five and ten seconds, don't just scale
the same content longer: they change how much action the model is willing to fit
in, so the prompt has to change with the duration, not only the length setting.

The recipe:

- At 5s: describe exactly one action beat ("she turns and smiles"), not a
  sequence of them — multi-beat prompts get compressed into unnaturally fast motion.
- At 10s: ask for one setup beat plus one payoff beat, or a two-shot sequence,
  but still not three-plus events.
- If the action itself is inherently short (a blink, a door closing), a 10s
  request often gets padded with idle micro-motion or camera drift rather than
  looping — write in a secondary ambient detail to give it something motivated
  to do with the extra time.
- Don't request more duration than the action needs; unmotivated extra time is
  where drift and warping creep in.

Why: the model allocates a roughly fixed motion budget across the requested
duration. Cramming multiple actions into 5s forces unnaturally fast,
artifact-prone motion, while leaving 10s under-specified invites the model to
fill the dead time with generic ambient movement that reads as aimless rather
than intentional.

Example (10s): "A hand reaches for a doorknob and turns it. The door creaks
open, revealing a sunlit hallway with dust motes drifting in the light."

Counter-example (5s): "She walks in, sits down, picks up her coffee, and starts
typing" — four actions in five seconds forces jittery, sped-up motion that reads
as broken rather than efficient.
