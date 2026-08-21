---
id: voiceover-delivery-and-pacing-avoiding-metronomic-tts-cadence
title: Avoiding metronomic TTS cadence
category: audio
subcategory: voiceover-delivery-and-pacing
tags: [pacing, tts, naturalism, artifacts]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Generated voices default to near-identical inter-word timing and syllable
duration across a whole script, which is the single fastest tell that a voice
is synthetic — real speech varies its rate constantly, even within one sentence.

The recipe:

- Vary syllable duration across a script by roughly 15-25%: compress function
  words (the, a, of, to) and stretch content words, rather than giving every
  word equal duration.
- Break up sentence length on purpose — alternate a 4-word sentence with a
  12-word one; uniform sentence length produces uniform cadence even from a
  human reader.
- If the engine supports rate or emphasis tags, apply them per breath group
  instead of once globally, so the variance moves around the script.
- Where the tool allows a reference read or multiple takes, pick the take with
  the most natural rate drift rather than the flattest, most "correct" one.

Why: real speech rate correlates with cognitive load, emotion, and word
salience — it speeds up on throwaway phrases and slows on important or
unfamiliar ones. A model that renders every word at the same duration produces
technically intelligible but perceptually robotic speech, because the listener's
ear is tuned to expect that variance as a marker of a thinking, feeling speaker.

Example: script alternates short punchy lines with one longer explanatory line,
and emphasis tags are placed on different words in each breath group.
Counter-example: a script of uniform 8-word sentences fed to TTS with no
per-word rate variation — intelligible, but unmistakably synthetic.
