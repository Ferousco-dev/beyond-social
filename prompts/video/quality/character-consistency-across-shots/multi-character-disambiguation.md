---
id: character-consistency-across-shots-multi-character-disambiguation
title: Give co-starring characters maximally distinct anchors, not just names
category: video-quality
subcategory: character-consistency
tags: [character-consistency, multi-character, prompting, identity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

When two characters share a scene, the model can blend their features toward each
other, especially in a shot where both are in frame together, unless their anchoring
descriptors are built to be maximally distinguishable rather than just individually
correct.

The recipe:

- Choose contrasting values on the features most likely to blend: different hair
  colors or lengths, different builds, different approximate ages, rather than two
  characters who are both "brown-haired, athletic, late 20s."
- Label each character's locked clause with a short handle used consistently in every
  prompt ("Character A: ...", "Character B: ...") so the model has an explicit token
  to attach each description to, rather than relying on sentence order alone.
- In two-shot and group prompts, restate both full locked clauses rather than
  shortening one to "the other person" or "her friend," which gives the model
  nothing to anchor the second face to.
- For shot/reverse-shot pairs, generate each character's coverage from their own
  individually locked reference, then verify both faces read as distinct once cut
  together, not just correct in isolation.
- If two characters are visually similar by design (siblings, a fashion campaign's
  matched pair), lean harder on wardrobe and one strong distinguishing mark per
  person to keep them separable, since hair and build won't do the job alone.

Why: the model conditions on all the text in a prompt simultaneously, and two
similar descriptions in the same prompt compete for the same feature space, so
without deliberate contrast the easiest solution for the sampler is often to
generate two faces that are closer to each other than either description alone
called for.

Example: "Character A: short black hair, slight build, mid-20s. Character B: long
blonde hair, tall, early 30s" restated in full for every two-shot.
Counter-example: "two friends talking, one with dark hair, the other similar in
age" — no real contrast, high risk the sampler renders near-twins.
