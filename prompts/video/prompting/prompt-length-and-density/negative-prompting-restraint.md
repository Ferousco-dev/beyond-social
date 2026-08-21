---
id: prompt-length-and-density-negative-prompting-restraint
title: Keep negative prompts short and reactive
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, negative-prompting, restraint]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

Negative prompts and exclusion lists should be short and aimed at a specific,
observed failure, not a long defensive list of everything you do not want,
because an oversized negative list competes for the same attention budget as
the positive description.

- Use negative prompting reactively: generate first, identify the actual
  defect, then add one negative term for that specific defect.
- Keep the negative list under roughly five or six terms. Beyond that it
  stops reliably suppressing anything and mostly dilutes the positive
  prompt's weight.
- Prefer fixing the positive prompt over adding a negative term when
  possible: "static tripod shot" solves camera shake more reliably than "no
  shaky camera" does.
- Never use negative prompting to try to remove something the positive
  prompt is actively implying, for example asking for a "crowd scene" and
  then negative-prompting "no crowd."

Why: a negative term tells the model what not to move toward, which is a
weaker and less specific signal than telling it what to move toward instead.
A long negative list often reads as noise the system has to hold without
clear direction, and it cannot undo a strong implication already set up by
the positive prompt, so it rarely fixes the problem it was added for.

Example: positive prompt tightly describes a clean product shot; negative
list: "no text overlay, no watermark, no extra hands."
Counter-example: a twenty-term negative list, "no blur, no distortion, no
extra limbs, no bad anatomy, no low quality, no artifacts," stacked onto
every generation regardless of what actually went wrong. It is boilerplate,
not diagnosis, and it crowds out the positive prompt's own weight without
fixing anything specific.
