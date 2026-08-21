---
id: match-cuts-and-continuity-lens-and-camera-height
title: Lens and camera height continuity
category: editing
subcategory: continuity
tags: [focal-length, camera-height, lens, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Real cinematography plans one lens per setup; when generated coverage silently
swaps focal length or camera height between clips, the geometry of the space stops
making sense and reads as inconsistency rather than a directorial choice.

- Pick one focal-length family per setup, such as "35mm-equivalent, slight wide,"
  and hold it for that scene's coverage; change it only for a deliberate close-up.
- Keep camera height matched to real eye-level logic (seated versus standing); do
  not cut from a low-angle hero shot to eye-level with no motivating reason.
- Specify aperture or background-blur character the same way in every clip so the
  "lens" feels like the same physical lens across the cut.
- Reserve focal-length changes for intentional scale shifts, not as an accidental
  side effect of separate generation calls defaulting to different values.

Why: focal length and camera height are what make a space feel physically real and
navigable; when they shift unmotivated between cuts, the audience loses the sense
of a single crew shooting a single space, and the sequence reads as artificial.

Example: "50mm equivalent, camera at seated eye height, f/2 background blur"
reused identically for both the medium shot and its reverse.
Counter-example: an extreme wide-angle establishing shot cut directly into a
compressed telephoto close-up of the same static conversation, with no zoom or
camera move to justify the jump.
