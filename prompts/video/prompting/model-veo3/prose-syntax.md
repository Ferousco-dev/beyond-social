---
id: model-veo3-prose-syntax
title: Write Veo 3 prompts as prose, not keyword stacks
category: video-prompting
tags: [prompt-syntax, natural-language, structure, veo3]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Veo 3 was trained on natural-language captions paired with footage, not on
comma-separated tag lists. It responds most reliably to two to four full
sentences written the way a director would brief a DP, not a keyword-soup
prompt in the image-model tradition.

Practice:

- Write complete sentences with a subject and a verb; keep modifiers attached
  to the noun they describe ("a cracked leather jacket") rather than trailing
  loose at the end of a list ("jacket, leather, cracked, worn").
- Order clauses the way you'd say them aloud: subject and action first, camera
  and light as trailing clauses that modify the sentence, not separate tags.
- Drop keyword-stacking blocks entirely: "8k, hyperrealistic, trending, award
  winning" carries no syntactic role and gets treated as noise, not
  instruction.
- If a detail matters, put it in a clause that says why it matters ("her
  hands shake slightly, cold") rather than a bare adjective floating in a list.

Why: the model's training captions are sentences describing what's happening in
a shot, so it has a strong prior for parsing grammatical structure into
subject, action, and modifier. A tag list has no grammar for the model to
anchor to, so disconnected keywords get averaged into generic, undirected
motion instead of shaping the shot the way a sentence's clauses do.

Example: "A courier in a rain-speckled yellow jacket leans her bike against a
brick wall, breath fogging in the cold air. The camera holds steady at eye
level as she checks her phone, streetlight flaring softly behind her."
Counter-example: "courier, bike, rain, yellow jacket, streetlight, 8k,
cinematic, hyperrealistic, trending, award-winning." No sentence structure,
so the model has nothing to hang the details on beyond a generic average.
