---
id: subject-consistency-descriptions-avoiding-overspecification-conflict
title: Why more identity detail can break consistency past a point
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, prompt-density, character-description, artifacts]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Past a certain density, adding more identity descriptors stops improving
consistency and starts breaking it, because conflicting or redundant detail
competes for the model's limited attention.

- Cap identity description at the five to seven anchor traits that actually
  distinguish the subject; cut anything a viewer wouldn't consciously notice
  in the finished footage.
- Check each new descriptor against the others for redundancy or contradiction
  before adding it — two competing hair-color words, an accessory mentioned
  twice with different colors.
- Move situational detail — expression, pose, momentary action — out of the
  identity block and into shot-specific language so it isn't competing with the
  permanent traits for the model's attention.
- If a subject keeps morphing despite a full description, remove detail and
  re-test before adding more; the fix is usually subtraction, not addition.

Why: this follows the same logic as other artifact-prone generation — complexity
multiplies failure. A long, dense description forces the model to trade off
which details to honor within its limited capacity, and it's often the subtle,
identity-carrying details that get dropped first, not the obvious ones.

Example: five anchors in one sentence — "squared jaw, close-set brown eyes, a
mole below the left eye, straight low hairline, olive canvas jacket."

Counter-example: a twelve-clause paragraph covering jaw, eyes, mole, hairline,
eyebrows, eyelashes, nose, lips, ears, jacket, shirt, and shoes — the model
averages or silently drops several of these, and which ones survive changes
with every regeneration.
