---
id: model-kling-motion-strength-slider
title: Tuning Kling's motion strength parameter
category: video-prompting
subcategory: model-kling
tags: [motion-strength, parameters, physics, motion-fidelity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Kling's motion strength (labeled "motion intensity" or exposed as camera/subject
motion sliders in the generation panel) sets how much displacement the model
injects per second; treat it as a dial between a photograph that breathes and a
collage falling apart.

- Start at the low-to-mid third of the range (roughly 2-4 on a 10-point scale)
  for product shots, portraits, or anything with legible small detail like
  hands, type, or jewelry.
- Reserve the top third for wide shots with large, simple moving masses: water,
  fabric, smoke, crowds seen from a distance.
- Pair a higher slider value with a simpler prompt, fewer named actions, since
  the model spends its motion budget on whatever verbs you give it and too many
  compete for the same budget.
- Watch the first two seconds of a test render: if edges swim or a logo
  smears, drop the slider one notch before rewriting the prompt.

Why: the slider does not add "more action," it raises how far the diffusion
process is allowed to move pixels between frames. Past a threshold the model
can no longer keep object identity locked across that displacement, so it
starts inventing intermediate shapes, which reads as morphing rather than
motion.

Example: motion strength 3, prompt "barista's hand slowly pours milk into a
cup, steady shot."
Counter-example: motion strength 9 with the same "slowly" prompt — the slider
fights the word "slowly," producing a lurching, warped pour instead of a
smooth one.
