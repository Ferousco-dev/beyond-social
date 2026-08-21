---
id: negative-prompting-specificity-over-vagueness
title: Cash out vague exclusions into concrete, physical terms
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, specificity, phrasing, craft]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A negative prompt like "no bad quality" or "not ugly" gives the model nothing to
act on, because "bad" and "ugly" are not renderable properties. Every exclusion
needs to name the specific visual symptom, the same way a colorist names a
specific artifact instead of saying a shot "looks off."

The recipe:

- Replace judgment words with observable failures: not "bad hands" but "fused
  fingers, extra digit, hand passing through object."
  Not "low quality" but "compression blocking, banding in the sky gradient."
- Name the body part or region the failure occurs in, not just the failure.
  "Warping" alone is vague; "warping at the jaw and ear during head turn" is
  specific enough to steer.
- Write exclusions the way a VFX supervisor logs a shot note: what broke, where,
  under what motion.

Why: negative prompting works by giving the model a contrast signal, a
directional push away from a describable region of its output space. A vague
term like "ugly" has no fixed region to push away from, so the model either
ignores it or makes arbitrary, sometimes counterproductive changes. A concrete
symptom has a consistent visual signature the model has actually learned to
recognize and suppress.

Example: "exclude: warped teeth on smile, doubled eyebrow line, text on
signage rendered as illegible glyphs."
Counter-example: "exclude: bad face, weird, low quality." This gives the model
three unrelated, undefined targets and typically produces no measurable
improvement over omitting the negative prompt entirely.
