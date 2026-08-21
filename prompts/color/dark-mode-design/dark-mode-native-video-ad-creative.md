---
id: dark-mode-design-video-ad-creative
title: Shooting product-video footage that will be composited into a dark UI
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, video, lighting, product-video]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

When a generated or filmed clip will sit inside a dark-themed app mockup or a
dark-background ad (a phone screen recording, a dashboard demo, a night-use
scene), the footage itself needs low-key lighting choices, not just a dark UI
skin pasted around bright-lit footage, or the seam between "real" footage and
"UI" reads as an obvious composite.

- Light the subject with one dominant motivated source (a lamp, a monitor's
  own glow, a window at dusk) instead of flat, even key light — real low-light
  footage has falloff and one shadow direction, not shadowless illumination.
- Keep the screen-glow on a talent's face color-accurate to the device shown
  in frame (cool blue-white for a phone UI, warmer for an amber-toned reading
  app) rather than a generic bright wash — mismatched screen-glow color is one
  of the fastest tells of a composited or AI-generated shot.
- Preserve genuine shadow detail instead of crushing blacks to pure `#000` in
  the grade; real low-light sensors retain slight noise and gradient in the
  shadows, and true crushed black reads as a graphic overlay, not captured
  light.
- Avoid dithering artifacts by shooting or generating at a bit depth that
  survives compression — banding in a dark gradient background (sky, wall,
  UI backdrop) is a giveaway of over-compressed or low-effort dark footage.

Why: viewers have an intuitive sense of how real cameras behave in low light
— sensor noise, single-source falloff, color-matched glow — built from a
lifetime of phone footage shot at night. A composite that skips these physical
cues, however clean it looks in isolation, reads as synthetic the instant it's
placed next to real dark-environment footage.

Example: "handheld phone shot, single warm desk-lamp key light camera-left,
visible shadow falloff on the far side of the face, subtle sensor noise in
the shadows, screen glow color-matched to a blue-toned app UI."

Counter-example: evenly lit studio footage with lifted shadows dropped onto a
black UI background with a vignette added in post — the lighting direction and
shadow behavior never matches a real low-light capture.
