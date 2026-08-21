---
id: environment-consistency-across-shots-prop-placement-anchoring
title: Anchoring prop position across a scene
category: video-quality
subcategory: prop-continuity
tags: [props, continuity, set-dressing, script-supervision]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Props must be pinned to an explicit position and re-stated identically in every
subsequent shot's prompt, or they drift, duplicate, or vanish between cuts.

The recipe:

- Describe each prop's exact position relative to a fixed anchor ("coffee mug,
  handle facing camera, right third of the desk"), not just its presence.
- Re-include the same prop description verbatim in every shot of the scene;
  don't paraphrase it and expect the model to infer sameness.
- If a prop's state changes between shots (picked up, moved, opened), name
  that change explicitly rather than omitting the prop and hoping continuity
  holds on its own.
- Give hero props one identifying trait (label color, distinct shape) so a
  fresh generation converges on the same object instead of inventing a new one.
- Keep incidental background props sparse — fewer objects means fewer chances
  for something to mutate unnoticed.

Why: generative video has no object permanence between separate generation
calls. Treat every shot's prompt the way a script supervisor treats a
continuity photo: a complete restatement of exactly what's in frame and where,
not a delta from the previous shot.

Example: "same green ceramic mug, handle right, unchanged position,
bottom-left of frame" restated in shots 1 through 4.
Counter-example: describing the mug once in shot 1 and never again — by shot
3 the model renders a paper cup, or moves it to the opposite side of the desk.
