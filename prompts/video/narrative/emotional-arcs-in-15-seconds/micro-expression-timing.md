---
id: emotional-arcs-in-15-seconds-micro-expression-timing
title: Describing the onset, apex, and offset of an expression
category: narrative
subcategory: performance
tags: [performance, facial-expression, timing, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

An emotional turn on a face reads as real only when the expression is described as unfolding across a short timeline, onset, apex, offset, rather than as an instant swap between two static poses. A prompt that names only the target expression gives a generator nothing to interpolate, and it will render the change as a snap.

- Describe onset explicitly: the expression begins to form over a fraction of a second, not instantly.
- Describe an apex hold: the peak expression sits for a beat before it starts to relax.
- Describe offset as a relax, not a cut; the expression should visibly ease rather than disappear.
- Ask for slight asymmetry between the two sides of the face; real expressions are not mirror-symmetric.
- Never describe an expression change as a single instruction like "she looks surprised then happy" with no timing attached.

Why: facial action researchers have long documented that real expressions unfold in distinguishable onset, apex, and offset phases, and that genuine expressions are typically asymmetric while posed ones tend toward symmetry. A generator given only an end-state target has no basis for interpolating a believable path to it, so it defaults to the fastest, most symmetric transition available, which is exactly the tell of a synthetic performance.

Example: "eyebrows lift and soften over roughly a third of a second, a small asymmetric mouth twitch precedes the full smile, which holds for a beat before easing."
Counter-example: "she suddenly looks surprised then happy" with no timing description, which a generator renders as an instant pose swap that reads as a cut rather than a felt reaction.
