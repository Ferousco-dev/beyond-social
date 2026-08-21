---
id: match-cuts-and-continuity-priority-triage
title: Triaging continuity priorities when stitching generated clips
category: editing
subcategory: continuity
tags: [triage, workflow, priorities, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

AI generation cannot guarantee every continuity element holds across independently
generated clips, so budget effort by how fast a viewer notices each kind of break,
rather than treating every mismatch as equally worth a regeneration.

- Rank continuity elements by notice speed: identity and face first, then lighting
  direction and color, then wardrobe or prop detail, then background clutter last.
- Spend prompt-writing effort and regeneration credits on the top of that list;
  accept minor background drift before accepting a face that visibly drifts.
- Use tighter framing to hide the lowest-priority items, cropping out background
  detail the model cannot reliably hold, instead of fighting to force it to hold.
- Keep a running plain-text "continuity bible" per project, and paste the locked
  lines into every clip's prompt rather than re-writing them from memory each
  time, which is where small inconsistencies creep in.

Why: treating every element as equally important wastes limited regeneration
budget on invisible fixes while leaving the highest-impact error unaddressed;
professional productions run the same triage with a script supervisor's priority
list rather than trying to lock everything at once.

Example: a continuity bible line reused verbatim across every clip's prompt:
"IDENTITY: ref_image_v2, brown bob, gold hoop earrings, LOCKED, do not vary."
Counter-example: spending a regeneration on a slightly different throw-pillow
color while a visibly different face in the same sequence goes unaddressed.
