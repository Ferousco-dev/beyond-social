---
id: prompt-length-and-density-audio-visual-density-split
title: Give dialogue and visuals separate density budgets
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, dialogue, audio]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Dialogue, voiceover, and sound cues need their own tighter length budget,
separate from the visual description. Cramming both into one dense paragraph
causes one channel to end up under-specified because they are competing for
the same prompt space.

- Write the visual description and the audio or dialogue cue as clearly
  separated segments, not interleaved clause by clause.
- Keep dialogue lines short enough to plausibly fit the clip's duration at a
  natural speaking pace, roughly two to two and a half words per second. An
  overlong line either gets rushed or truncated.
- Specify audio character briefly and separately from visual character, tone
  of voice, ambient bed, one cue is usually enough, applying the same
  one-thing-at-a-time restraint used for camera motion.
- When a platform's model treats visual and audio as genuinely separate
  inputs, do not pad the visual prompt with audio adjectives like "warm
  sounding scene" that only make sense as sound direction.

Why: visual and audio generation often draw on different parts of a model's
conditioning, or are handled by separate passes entirely, so a merged block
forces one channel to be inferred from language meant for the other.
Separating them lets each carry its own appropriately sized description
without starving the other of the length it actually needs.

Example: visual, "Woman at a kitchen table, morning light, sets down a
phone." Audio, dialogue line "I'm not going," flat and quiet delivery,
ambient: faint kettle simmering.
Counter-example: one paragraph reading "Woman says 'I'm not going' quietly
and sadly at a kitchen table in warm morning light with a sad, contemplative,
gentle ambient tone" — dialogue delivery notes, visual light description, and
ambient mood flattened into one run-on that under-serves all three.
