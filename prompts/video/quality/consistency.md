---
id: quality-consistency
title: Character and scene consistency across shots
category: video-quality
tags: [consistency, character, identity, multi-shot]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The hardest problem in multi-shot generated video is keeping the same subject
looking like itself from shot to shot. Consistency must be engineered; it does not
happen for free.

Techniques:

- Anchor identity in words: repeat the same specific description every shot (age,
  hair, wardrobe, exact product colorway and markings). Vague subjects drift most.
- Reuse a reference: seed each shot from the same reference image or a frame of the
  previous shot when the tool allows; image-to-video is far more consistent than
  text-to-video across shots.
- Hold the environment: same location, lighting, and grade clause in every prompt
  (see color continuity).
- Limit variables per shot: change one thing (angle, action) at a time so the
  subject is not re-imagined wholesale.
- Design around it: cut to detail shots, hands, or the product between character
  shots so minor drift is less noticeable, and prefer fewer, longer shots over many
  short ones of the same person.

Why: inconsistency reads as a different person or product and shatters believability;
deliberate anchoring is what makes a multi-shot piece feel like one production.

Example: every shot: "the same woman, mid-30s, short curly black hair, red linen
shirt", seeded from one reference. Counter-example: "a woman" described freshly each
shot, yielding a different person every cut.
