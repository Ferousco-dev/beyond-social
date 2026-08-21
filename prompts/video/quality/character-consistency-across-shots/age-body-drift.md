---
id: character-consistency-across-shots-age-body-drift
title: Watch for age and body-type creep, the drift viewers name last
category: video-quality
subcategory: character-consistency
tags: [character-consistency, age, body-type, quality-control]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Age and build drift slower and more subtly than hair or face-shape drift, which
makes it dangerous: a viewer often can't say what's wrong, only that something is
off, because the character has quietly gotten a few years older or a noticeably
different build across the sequence without any single shot looking wrong in
isolation.

The recipe:

- State a specific age or narrow age range in the locked identity clause ("early
  30s," not "adult") and repeat it in every shot prompt rather than letting the model
  infer age from context each time.
- State build with a concrete reference ("athletic, broad-shouldered," "slight
  build") rather than leaving it unspecified, since unspecified build is where the
  model has the most freedom to vary.
- Review the sequence in fast sequence, not shot by shot in isolation, specifically
  looking for gradual creep; age and weight drift are much easier to catch when
  comparing shot one directly against shot six than when reviewing each shot on its
  own merits.
- Pay particular attention to any shot generated with a wider framing (full body),
  since build drift is most visible there and least visible in tight close-ups.
- If a shot drifts on age or build, do not patch it alone; regenerate it from the
  same locked reference and clause used for the rest of the sequence so the fix
  doesn't introduce a third variant.

Why: age and build are encoded diffusely across many pixels rather than in one sharp
feature, so small per-generation sampling variance nudges them gradually instead of
snapping them, and gradual drift is exactly the kind of error human perception is
worst at flagging shot-by-shot.

Example: "early 30s, athletic build, broad shoulders" held constant across a
six-shot sequence, verified by comparing shot one and shot six side by side.
Counter-example: leaving age and build unspecified and only catching, after the full
sequence is cut together, that the character looks noticeably older and heavier by
the final shot.
