---
id: character-consistency-across-shots-fixed-descriptor-block
title: Lock a literal descriptor block instead of re-describing the character
category: video-quality
subcategory: character-consistency
tags: [character-consistency, prompting, continuity, identity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Write one literal, physically-specific description of the character once, then paste
that exact clause into every shot prompt in the sequence unchanged. Freeform
re-describing invites the model to treat each shot as a new casting call.

The recipe:

- Cover age range, hair (color, length, texture, parting), eye color, skin tone with
  undertone, build, and one or two distinguishing marks (a mole, a gap tooth, a
  brow scar) in under 40 words.
- Freeze the exact wording. Do not swap synonyms between shots ("dark blonde" in shot
  2 and "sandy blonde" in shot 5 reads as two different people to the model, even
  though a human reader would treat them as the same thing).
- Store the clause once, in a shared variable or template partial, and interpolate it
  into every shot prompt rather than retyping it, which is where drift usually enters.
- Append shot-specific action, wardrobe, and framing after the frozen clause; never
  merge new descriptive language into the identity clause itself.
- Keep the clause first in the prompt, before setting and action, so it has the most
  weight in what the model conditions on.

Why: diffusion and video models have no persistent memory between generations, so the
prompt text is the only continuity mechanism available. Any variation in how identity
is phrased is read as new information, not as a restatement of the same fact, and the
model has no way to know the two phrasings are meant to co-refer.

Example: "34-year-old woman, shoulder-length dark brown hair with a center part,
hazel eyes, olive skin, small scar above left eyebrow, athletic build."
Counter-example: describing her as "a pretty brunette" in shot one and "an athletic
woman with chestnut hair" in shot four — different vocabulary, different face.
