---
id: hands-faces-and-text-in-frame-crowd-and-multi-face-scenes
title: Managing quality across multiple faces in one shot
category: video-quality
tags: [faces, crowd, multi-subject, composition]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Face fidelity drops with every additional face the model has to render in the
same frame, so a scene with a crowd needs a different compositional strategy than
a single-subject shot, not just the same prompt with more people added.

How to compose multi-face shots:

- Give the shot one clear foreground face in focus and let everyone else fall
  into soft focus or partial occlusion behind them; only the sharp face needs to
  hold up under scrutiny.
- Cap named, distinct background faces at a handful; beyond that, describe the
  group as a mass ("a loosely packed crowd, backs and shoulders visible") rather
  than asking for many individually rendered faces.
- Turn background faces away from camera or angle them past profile where
  possible; a crowd of turned heads and shoulders reads as populated without
  needing every face to resolve.
- Keep background figures in motion or partially obscured by foreground elements
  (a doorway edge, another person's shoulder) rather than static and fully visible,
  since motion blur and occlusion both mask geometry errors.
- If the concept truly needs several sharp, distinct faces (a group photo moment),
  generate it as a shorter, mostly-static shot rather than one with camera or
  subject movement, since movement is where multi-face degradation compounds fastest.

Why: every additional face the model must track and animate consistently adds to
the same temporal-consistency budget a single face already strains, so spreading
that budget across many faces means every one of them gets worse, not that the
model handles crowds as well as portraits.

Example: "one subject sharp in the foreground mid-frame, a loosely packed crowd
soft-focused behind them, mostly turned away or in shadow."
Counter-example: "eight friends in a row, all facing camera, all in sharp focus,
all talking" — spreads limited fidelity across eight faces at once and multiplies
the chance any one of them warps.
