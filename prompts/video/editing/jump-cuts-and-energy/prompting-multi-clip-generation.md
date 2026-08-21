---
id: jump-cuts-and-energy-prompting-multi-clip-generation
title: Prompting separately generated clips to cut together like real jump cuts
category: editing
subcategory: generation-technique
tags: [jump-cut, prompting, continuity, ai-look]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

When separately generated clips are meant to be jump-cut together, the
prompts need an explicit continuity contract across them, setting, light,
wardrobe, framing family, while still allowing the small variance a real
two-take jump cut would have.

- Write one shared continuity block, location details, light source and
  color temperature, wardrobe, key prop positions, and paste it unchanged
  into every clip's prompt in the sequence.
- Vary only what should vary: shot scale or angle between clips, to give the
  cut somewhere legible to land, per the discontinuity-threshold rule.
- Don't ask for "identical" subject pose across clips; ask for the same
  subject, setting, and wardrobe, and let pose vary naturally per clip.
- Generate one extra variant per cut point when possible, so a continuity
  mismatch, a prop that drifted, can be swapped out instead of forcing a bad
  pair together.

Why: a generator has no persistent memory of the previous clip's exact
pixels; anything not explicitly pinned in the prompt is free to drift.
Treating the shared details as a contract, not a suggestion, is what makes
two independently generated clips behave like two takes of one continuous
shoot instead of two different scenes wearing the same words.

Example: "continuity block: small home office, window camera-left with soft
daylight, navy sweater, laptop closed on the desk's right edge — reused
verbatim across clip 1 (medium shot) and clip 2 (close-up)."

Counter-example: writing a fresh, slightly different description of "a home
office" for each clip in the sequence, letting the generator reinvent the
wall color, window position, and lighting each time, so the jump cut exposes
a scene change instead of a compressed moment.
