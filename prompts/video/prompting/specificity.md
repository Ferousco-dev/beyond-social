---
id: video-prompt-specificity
title: Specific and physical beats vague and abstract
category: video-prompting
tags: [prompt, specificity, concrete, physical]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.93
---

Video models render what is physically describable, not what is abstract. Trade
mood-words for observable detail: instead of "epic", say "low-angle, wide lens,
subject fills the frame against a dawn sky." The camera cannot photograph
"epic"; it can photograph the things that make a shot feel epic.

Rules of thumb:

- Replace adjectives with nouns and physics. "Cozy" becomes "warm practical lamp,
  soft shadows, wool textures." "Fast" becomes "whip pan, motion blur, quick
  handheld."
- Quantify motion. "Walking slowly toward camera" beats "moving." Direction and
  speed are information the model can act on.
- Name real materials and light. Brass, denim, wet asphalt, backlit steam, neon
  reflected in a puddle: concrete nouns render; vibes do not.
- One subject, one primary action per shot. Two simultaneous actions blur.

Why: abstractions get averaged into generic footage; physical description
constrains the model toward the exact frame you want and dramatically reduces
"AI-looking" output.

Example: "Extreme close-up of rain beading on a car's blue hood, droplets sliding,
overcast soft light, reflections of a red traffic light." Counter-example: "a
moody, cinematic, dramatic car scene that feels premium and emotional."
