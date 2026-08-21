---
id: three-point-lighting-hard-vs-soft-shadow-edge
title: Shadow edge quality as a hardness signal
category: lighting
subcategory: three-point
tags: [hard-light, soft-light, shadow-edge, key-light]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

The single most reliable descriptor of light hardness is not brightness but
the transition speed of a shadow's edge — how quickly it goes from lit to
dark — and naming that transition is more precise than saying "harsh" or
"soft" light.

- Soft light: the shadow edge is a gradual gradient over an inch or more,
  produced by a source that is large relative to its distance from the
  subject — a softbox close to the face, an overcast sky, a window with
  diffusion.
- Hard light: the shadow edge is a near-instant, crisp line, produced by a
  small source relative to its distance — direct sun, a bare bulb, a small
  undiffused fixture.
- The same source can be either: direct sun (small relative to the whole sky)
  is hard; the same sun through cloud cover (now effectively a huge diffused
  source) is soft. Describe the effective size, not just "sunlight."
- Match shadow hardness to genre: soft edges for beauty, skincare, calm
  lifestyle; hard edges for sport, tech drama, high-energy UGC.

Why: "harsh" and "soft" as bare adjectives are inconsistently interpreted, but
describing the physical relationship (small source far away versus large
source close) gives the model a mechanism that reliably produces the matching
shadow-edge behavior, because that relationship is the actual physics behind
the effect.

Example: "direct hard sunlight, crisp-edged shadow of the subject's profile
cast sharply on the wall behind them."
Counter-example: "harsh dramatic lighting" with no source-size cue — often
rendered as merely darker and higher-contrast rather than with the
characteristic crisp shadow edge hard light actually produces.
