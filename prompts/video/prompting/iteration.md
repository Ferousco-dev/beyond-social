---
id: video-prompt-iteration
title: Iterating a prompt from the output
category: video-prompting
tags: [prompt, iteration, debugging, refinement]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Treat a generation as a diagnostic, not a dice roll. Change **one variable at a
time** and read the result against a specific fault. Rewriting the whole prompt
after a bad take throws away the information the take gave you.

A fault-to-fix map:

- Subject drifts or morphs: reduce competing detail, name identity anchors, lower
  camera movement.
- Motion too chaotic: specify slower, single-direction movement; remove one action.
- Looks generic / "AI": add physical specifics (materials, light direction), a
  concrete lens/shot, and a defined style.
- Wrong mood: change lighting and color words, not the subject.
- Composition off: set shot size and camera angle explicitly.
- Too fast/slow: state pace ("slow, deliberate" vs "quick, energetic").

Why: video generation has real variance; systematic single-variable iteration
converges, and it teaches the reusable lesson (which cue fixed which fault) that
the feedback loop can later encode as knowledge.

Example: output morphs the logo, so the next prompt adds only "keep the logo shape
and text exact" and nothing else changes. Counter-example: the output is slightly
off so the whole prompt is rewritten, and now it is impossible to tell what helped.
