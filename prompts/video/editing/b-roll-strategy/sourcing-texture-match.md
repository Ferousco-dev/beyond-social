---
id: b-roll-strategy-sourcing-texture-match
title: Match grain, lens character, and color when mixing b-roll sources
category: editing
subcategory: sourcing
tags: [texture-match, grain, lens-character, generated-footage]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

When a-roll is real (shot or phone-captured) and b-roll is stock or generated,
the two sources need their texture reconciled or the cut between them will
visibly disagree, no matter how good either shot is on its own.

- Match apparent capture format: don't cut a clean, deep-depth-of-field
  generated insert next to visibly handheld, slightly noisy phone a-roll; add
  matching grain and a touch of motion blur to the clean source instead.
- Match white balance within roughly 200K across sources before grading, then
  grade the whole timeline as one pass rather than per-clip.
- Match the lens's apparent focal length: a-roll that reads like a handheld
  24-35mm phone shot should not intercut with an obviously compressed,
  telephoto-feeling b-roll perspective.
- For generated b-roll specifically, prompt for the same imperfections present
  in the real footage (slight handheld drift, natural exposure variance)
  instead of a locked-off, pristine push-in.

Why: viewers do not consciously catalog sensor size or lens compression, but a
texture mismatch between adjacent shots registers as "something's off" and
breaks the illusion that one crew shot the entire piece in one session, which
is exactly the seam that separates a footage mix from a composited one.

Example: adding a faint film-grain overlay and a slight handheld sway to an
overly clean generated insert so it sits next to real phone footage without
visibly standing apart.
Counter-example: intercutting a glassy, gimbal-smooth, deep-focus generated
shot directly against grainy handheld a-roll with no grade pass to reconcile
them — the seam is visible to non-technical viewers within a frame or two.
