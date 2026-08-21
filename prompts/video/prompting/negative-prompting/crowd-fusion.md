---
id: negative-prompting-crowd-fusion
title: Excluding background-crowd fusion artifacts
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, crowd, background, anatomy]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Any generated shot with more than two or three background figures risks
fusion: shared limbs between adjacent people, faces that repeat with slight
variation, bodies that merge at the point they overlap in frame. This scales
with figure count and proximity, so the negative prompt should target the
specific geometry of crowding, not "bad people" in general.

What to exclude and how to scope the shot around it:

- Exclude "fused limbs between figures, shared torso, merged bodies at
  overlap points, repeated identical faces" as literal terms whenever more
  than two background figures are in frame.
- Where the crowd is set dressing rather than the subject, the more reliable
  fix is compositional: keep background figures small, out of focus, and
  non-overlapping in the frame rather than relying on the negative prompt to
  fix dense overlap after the fact.
- Exclude "background figures facing camera directly," since crowds rendered
  with every extra looking at the lens read as a render artifact rather than
  a candid moment; real crowds face many directions.
- For a defined foreground crowd (a concert, a street), cap named figure
  count in the positive prompt itself rather than saying "a crowd," which
  invites the model toward maximum density and maximum fusion risk.

Why: fusion is a direct function of how many overlapping human silhouettes the
model has to resolve at once; every additional overlapping figure multiplies
the chance of a shared-limb error, so controlling density in the positive
prompt prevents more failures than any negative term can clean up afterward.

Example: "three background figures, clearly separated, out of focus, facing
away from camera; exclude: fused limbs, shared torso between figures."
Counter-example: "a busy crowded street full of people" with only "no weird
bodies" in the negative prompt, on a shot where the crowd itself was never
scoped down.
