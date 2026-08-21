---
id: three-point-lighting-imperfect-falloff
title: Falloff and vignette as the anti-AI-flatness fix
category: lighting
subcategory: three-point
tags: [falloff, vignette, realism, uneven-light]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Generated video defaults toward evenly, uniformly lit frames because "well
lit" is the statistically safe interpretation. Real three-point setups always
have falloff — the light gets dimmer with distance and the edges of frame are
darker than the center — and naming that falloff is what breaks the uniform,
synthetic look.

- State that background brightness drops relative to the subject: "background
  falling into shadow a few feet behind the subject" rather than leaving the
  whole set evenly bright.
- Ask for a natural vignette at frame edges consistent with the light sources
  described, not a stylized post-processing vignette — it should read as the
  light physically not reaching the corners.
- Let one side of the subject go dimmer than the other rather than
  symmetrical lighting on both cheeks — real single or double-source setups
  are almost never perfectly symmetrical.
- Avoid stacking multiple full-strength sources aimed at the same subject
  from different angles "just in case" — that is what produces the shadowless,
  sourceless flood that reads as generated.

Why: uniform brightness across an entire frame has almost no real-world
lighting cause outside of a fully enclosed, evenly gridded soft-light box, so
when a model renders it by default, it is producing the exact signature that
makes footage look staged or synthetic rather than shot with a small number of
directional sources.

Example: "key and rim only, no fill, natural falloff so the background a few
feet behind the subject goes noticeably darker, soft vignette at the frame
edges."
Counter-example: "bright and clearly visible everywhere in the frame" — the
default the model reaches for on its own, and precisely the flat, sourceless
look that reads as generated.
