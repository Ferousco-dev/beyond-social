---
id: model-infinitetalk-lipsync-mouth-shape-bilabial-precision
title: Prompting for correct lip closure on bilabial and labiodental sounds
category: video-prompting
subcategory: mouth-sync-fidelity
tags: [infinitetalk, viseme, mouth-shape, phoneme]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The fastest way to spot a fake lip-sync is missed lip closure on B, M, P, and
missed teeth-to-lip contact on F, V. Real speech closes the lips completely for
bilabials; generic AI lip-sync often leaves a gap and just opens/shuts the jaw.

- Reference a source still with lips gently closed and relaxed, not open or
  smiling, so the model has a true "closed" pose to return to between words.
- In the prompt, name the trait rather than the phoneme: "crisp lip closure on
  consonants, no jaw-only mouthing" reads better to the model than IPA symbols.
- Avoid scripts that are dense with rapid bilabials back-to-back ("popcorn,
  bubblegum, mama") in a single beat, since consecutive closures are where
  sync networks are most likely to average and blur.
- Favor a driving voice with clear consonant articulation (a trained VO read)
  over a mumbled or fast-talking source track for anything in close-up.

Why: the model has to fully close the mouth mesh and briefly hide the teeth to
sell a bilabial; if geometry, texture, or timing round that corner, the closure
reads as "almost" closed, which the eye flags immediately since real human lips
either touch or they don't.

Example: "reference photo with mouth closed and relaxed, clear diction in the
driving audio, full lip closure on B/M/P sounds."

Counter-example: driving the avatar with a mumbled, low-effort voice memo where
consonants are swallowed, the model has no clean signal to close the mouth on
and defaults to a soft, closure-free jaw wobble.
