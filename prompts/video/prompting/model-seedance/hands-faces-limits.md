---
id: model-seedance-hands-faces-limits
title: Framing around Seedance's hand and multi-face weaknesses
category: video-prompting
subcategory: model-seedance
tags: [seedance, hands, faces, limitations, framing]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Complex hand articulation and more than two or three interacting faces in one
frame are still where Seedance is most likely to warp, so the fix is
compositional: choosing framing that never asks the model to solve the hard
case, rather than hoping the wording alone will save it.

The recipe:

- Keep hands doing one simple, large-scale action (holding, reaching, resting)
  rather than fine manipulation (typing, shuffling cards, tying a knot), which
  reliably fuses fingers.
- Favor medium and wide shots for hand-heavy actions; close-ups on moving
  hands are the single highest-artifact framing in the model.
- For crowd or multi-person scenes, keep faces small in frame or partially
  turned away rather than requesting several clear, forward-facing faces at once.
- If a hero close-up on hands or a face is required, generate it as its own
  short, simple clip rather than embedding it as one beat inside a longer
  multi-shot sequence, so the model has its full motion budget for just that
  one articulation.

Why: fine articulated motion and multiple simultaneous identity-consistent
faces both require the model to track many independent, fast-changing points
at once, which is exactly where diffusion-based motion synthesis loses
coherence between frames. Reducing the number of independent moving parts in
frame is the reliable lever, not prompt wording.

Example: "Medium shot, a hand reaches into frame and picks up a mug by the
handle, then lifts it out of frame."

Counter-example: "Close-up of two hands quickly shuffling a deck of cards" —
fast, fine, bilateral hand motion in close-up is close to a guaranteed source
of fused or extra-fingered artifacts.
