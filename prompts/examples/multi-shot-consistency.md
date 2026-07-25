---
id: example-multi-shot-consistency
title: Worked example, keeping one character across several shots
category: example
tags: [example, consistency, multi-shot, character, worked]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, explainer, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

## Brief

"A 20 second piece with the same barista in three shots."

## Shot plan

Character drift is the main failure mode in multi-shot generation, so identity is
pinned in words and repeated verbatim, and the environment clause is copied
across every shot. Between the two character shots sits a detail shot of hands,
which both advances the story and hides any residual drift.

## Identity and look clause, repeated in every prompt

"the same barista, early thirties, short dark curly hair, round glasses, green
apron over a white tee, in a small cafe with warm morning window light from
camera-left, warm filmic grade"

## Generation prompts

1. Medium shot of [clause], tamping coffee grounds, locked-off camera, shallow
   depth of field, 9:16.
2. Macro shot of hands locking the portafilter into the machine, steam rising,
   [clause], slow push-in, 9:16.
3. Medium close-up of [clause], sliding the finished cup across the counter and
   smiling, locked-off camera, shallow depth of field, 9:16.

## Why this works

The identity clause is not paraphrased between shots; paraphrase is what produces
a different person. The light and grade travel with it, so the three clips share
one world. The middle shot deliberately leaves the face, which is the cheapest
insurance against drift. Compare with "a barista" described freshly each time,
which reliably returns three different people.
