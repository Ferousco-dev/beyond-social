---
id: model-infinitetalk-lipsync-hand-gesture-speech-rhythm
title: Hand and shoulder gesture timed to speech, not decorative
category: video-prompting
subcategory: avoiding-stillness
tags: [infinitetalk, gesture, hands, body-language]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

Hands are a known failure point for generation models, so many talking-avatar
prompts avoid them entirely by framing tight, which is the safer choice most of
the time. When a wider frame including hands is the goal, gestures need to be
tied to speech rhythm or they read as random motion layered over the audio.

- Default to a frame that crops at the upper chest or collarbone when hand
  fidelity isn't essential; this sidesteps the model's weakest area rather
  than fighting it.
- When hands are in frame, keep gestures small and single-purpose: an open
  palm on a key point, a slight forward lean, rather than continuous
  gesticulation the model has to track across many frames.
- Time gestures to land on stressed words in the script, described directly:
  "a small open-hand gesture on the emphasized word," rather than leaving
  gesture timing to chance.
- Avoid scripts that call for counting on fingers, pointing at specific
  off-screen objects, or any gesture requiring precise finger articulation;
  these are exactly where hand artifacts concentrate.

Why: gestures that are rhythmically motivated by speech read as intentional
body language, the same way a real speaker's hands move with their point;
gestures with no relationship to the audio's stress pattern read as noise, and
on top of that, hands are where generation artifacts are most likely to appear
at all, so unnecessary hand motion adds visible risk for little payoff.

Example: "upper-chest framing, one small open-hand gesture timed to the
emphasized word in the first sentence, hands otherwise resting out of frame."

Counter-example: a wide shot with continuous, untimed hand-waving through the
entire read, gestures land on random syllables and any finger-level artifact
is fully visible for the whole clip.
