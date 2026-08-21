---
id: model-seedance-anti-cgi-vocabulary
title: Vocabulary that pushes Seedance away from the glossy CGI default
category: video-prompting
subcategory: model-seedance
tags: [seedance, realism, ai-look, texture]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Left to its defaults, Seedance's "cinematic" prior skews toward overly smooth
skin, uniformly clean surfaces, and evenly diffused light. The specific words in
the prompt are what pull it toward a photographed, imperfect look instead.

The recipe:

- Ask for surface imperfection explicitly: "visible pores and fine skin
  texture," "scuffed," "worn," "fingerprints on the glass," "slightly uneven
  paint."
- Specify a light source with a flaw, not just "good lighting": "single window
  light with a hard shadow edge," "overhead fluorescent with a slight green
  cast," "one practical lamp, rest of room in shadow falloff."
- Avoid quality-signaling adjectives entirely ("stunning," "professional,"
  "high-quality," "8k") — they correlate in training data with stock-photo
  gloss, not with realism.
- Name one specific, unglamorous real-world detail (a chipped mug, a scuffed
  floor tile) — a single concrete flaw does more than any number of "realistic"
  tags.

Why: quality-adjective prompts were paired in training with polished commercial
photography, so they steer the model toward that look. Naming physical
imperfection instead steers it toward the messier statistics of casually shot
real footage, which is what reads as authentic rather than generated.

Example: "Close-up of hands kneading dough, flour dusted unevenly on the worn
wooden counter, single overhead bulb casting a hard shadow."

Counter-example: "Stunning professional 8k cinematic shot of hands making
bread" — every word here pulls toward glossy stock-photo rendering, the
opposite of the intended effect.
