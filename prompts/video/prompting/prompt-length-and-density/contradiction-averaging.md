---
id: prompt-length-and-density-contradiction-averaging
title: Contradictory descriptors average instead of resolving
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, contradiction, consistency]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Contradictory descriptors do not cancel out to a middle ground you would have
chosen on purpose. They blend into an unstable compromise, a distinct failure
mode from the model simply picking one side.

- Watch for pairs that sound fine apart but fight together: "slow-motion" with
  "frantic," "static tripod shot" with "handheld sway," "golden hour" with
  "overcast."
- Time of day, camera stability, and pace are the three axes that most often
  contradict, because each tends to get described with multiple synonyms
  scattered through a longer prompt.
- Before finalizing, read the prompt as three separate axes (light, camera,
  motion) and confirm each axis holds exactly one value.
- To ask for a deliberate blend, name it explicitly rather than stacking
  opposites: "overcast light with a brief break of direct sun," not "sunny and
  overcast."

Why: the model conditions on contradictory cues by blending them in its
learned representation rather than choosing one, so the output tends toward
flat, hazy compromises: light with no clear direction, motion with no clear
speed. That reads as physically uncertain footage rather than a deliberate
creative choice, which is one of the faster ways to tip a shot into looking
synthetic.

Example: "Overcast daylight, soft directionless shadows, camera on a slider
moving at a constant slow rate."
Counter-example: "Bright sunny golden hour with dramatic overcast clouds,
slow-motion but energetic fast-paced editing feel" — light source and pacing
both contain built-in contradictions, and the model cannot render "bright" and
"overcast" as one coherent scene, so it tends to produce flat, hazy light with
none of golden hour's directional warmth.
