---
id: staging-and-blocking-negative-space-overlay
title: Staging a subject off-center to reserve negative space for text overlay
category: cinematography
subcategory: staging-and-blocking
tags: [negative-space, overlay, composition, social-templates]
applicability:
  platforms: [tiktok, instagram, youtube, facebook]
  productTypes: [ad-creative, short-form-video, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

If a caption, price tag, or CTA is going to be composited on top of the video,
the shot has to be blocked with a contiguous empty region for it before the
video is generated, not cropped or covered afterward.

- Pick one edge or third of the frame (commonly the upper third for hooks, or
  one full side in landscape) and keep it visually quiet: plain wall, soft sky,
  a blurred surface, nothing textured or high-contrast there.
- Push the subject and any product to occupy the opposite two-thirds of frame,
  staged so their silhouette does not cross into the reserved zone at any point
  during the described motion, not just in the first frame.
- On 9:16, also treat the bottom ~15% and top ~12% as reserved even without
  a caption plan, since platform UI (captions, like button, username) sits there.
- State the reserved zone in the prompt itself ("plain negative space in the
  upper third, no subject motion into that region") rather than assuming it.
- Do not center a subject and plan to just crop in later; cropping after
  generation changes the framing math and orphans the rest of the composition.

Why: text legibility depends on a stable, low-detail background behind it for
the whole duration it's on screen, and a generated clip has no "layers" to pull
that space from after the fact — the empty region has to exist in the footage
itself, held consistently as the subject moves.

Example: "subject staged in the lower-right two-thirds, upper-left third kept
as soft out-of-focus negative space for caption placement, no motion crossing
into that zone."
Counter-example: a centered subject filling the frame edge-to-edge with a
caption slapped over their face in post — the words become unreadable the
moment the subject moves or gestures.
