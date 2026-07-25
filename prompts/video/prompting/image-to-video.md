---
id: video-image-to-video
title: Prompting image-to-video (reference-driven)
category: video-prompting
tags: [image-to-video, reference, product, kie, veo]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, ugc, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.92
---

When a reference image seeds the video (the core flow for product content, where
one photo becomes a clip), the image already fixes the subject and composition.
The prompt's job is then narrow: describe **motion and camera**, not the subject
again. Re-describing what the image already shows fights the reference and causes
drift.

Practice:

- Lead with the movement you want added: what the subject does, what the camera
  does. "The camera slowly pushes in; steam rises from the cup."
- Preserve, don't reinvent. Say "keep the product's shape, label, and color
  exactly" when identity matters (product shots, logos).
- Add only environmental motion the still implies: drifting steam, blowing hair,
  rippling water, shifting light. This reads as real without breaking the subject.
- Keep the first frame's framing in mind; large camera moves can push the subject
  out of a composition the image set up well.

Why: image-to-video is a constrained problem, the still is a strong prior.
Prompts that respect it get clean, identity-stable motion; prompts that re-specify
the subject introduce a competing description and morphing.

Example (with a product photo): "Slow push-in on the sneaker, gentle rotation on a
turntable, soft studio light sweeping across the mesh; keep the shape and colorway
exact." Counter-example: "a red sneaker on a white background, studio lighting,
product shot" (redundant with the image, adds no motion, invites drift).
