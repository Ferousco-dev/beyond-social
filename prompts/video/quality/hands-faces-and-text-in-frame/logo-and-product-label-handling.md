---
id: hands-faces-and-text-in-frame-logo-and-product-label-handling
title: Treating logos and product labels as locked assets
category: video-quality
tags: [logo, branding, product-video, text]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A brand logo or product label is the one piece of text in a shot the client will
scrutinize pixel by pixel, so it needs a different pipeline than generated
background text: hold it static and let the shot move around it, rather than
letting the model regenerate the mark on every frame.

How to handle logos and labels:

- Keep the labeled surface of the product mostly stationary and camera-facing
  for any beat where the logo needs to be legible; motion and rotation of the
  labeled surface are what cause a logo to warp or smear frame to frame.
- Where the pipeline allows it, treat the label as a locked reference image and
  composite or anchor it rather than letting the generator reinterpret the
  artwork each frame.
- If the logo must appear on a moving or turning product, keep the logo-facing
  beat brief (under a second of camera-facing time) and let the rest of the turn
  happen with the label angled away or out of sharp focus.
- Never ask the model to invent or "improve" a logo's typography, spacing, or
  color; specify it should be reproduced exactly as given, and if the pipeline
  can't guarantee that, keep the logo out of the frame's focal point entirely.
- For any shot with an on-screen logo, plan a still-frame or product-photography
  cutaway of the label elsewhere in the edit; that shot carries the brand-accuracy
  weight so the moving generated shots don't have to.

Why: logos are trademarked, brand-guideline-locked assets where even minor drift
in a letterform or color is immediately visible to anyone familiar with the brand,
which is a much lower error tolerance than any other element in the frame.

Example: "product held camera-facing and still for one second, label sharp and
static, before the hand lowers it out of frame."
Counter-example: "product spinning continuously in hand with the logo always
in view" — guarantees the logo warps across the turn since it's never held stationary.
