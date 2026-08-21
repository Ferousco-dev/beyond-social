---
id: model-seedance-character-continuity
title: Holding one character's identity across a Seedance multi-shot sequence
category: video-prompting
subcategory: model-seedance
tags: [seedance, continuity, character-consistency, multi-shot]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

When a single Seedance generation cuts between shots of the same person,
identity consistency comes from repeating an anchoring description verbatim
across shots and from image conditioning, not from the model inferring "same
person" on its own.

The recipe:

- Repeat the exact same wording for identity-defining details (hair color and
  style, clothing, one distinguishing accessory) in every shot's sentence,
  rather than varying the phrasing.
- Introduce the character fully in the first shot, then use a short callback
  reference in later shots ("the same woman in the green jacket") instead of
  re-describing them from scratch each time, which risks a subtly different
  person.
- Where supported, anchor with a reference image for image-to-video rather
  than relying on text alone across a multi-shot sequence — text-only identity
  holds less reliably past two cuts.
- Avoid large swings in described lighting or camera distance between shots of
  the same face; big lighting changes make it harder to tell if a subtle
  identity drift is intentional continuity or a model error.

Why: the model has no persistent memory of "this specific person" beyond what
is re-stated or shown in each shot's conditioning, so identity is really a
matter of the embedding staying close enough between shots to render as the
same statistical person. Repeated concrete wording and a shared reference
image both help enforce that.

Example: "Shot 1: A woman with short red hair in a green jacket unlocks her
bike. Cut to: the same woman in the green jacket riding down the street."

Counter-example: "Shot 1: A young woman with red hair. Cut to: she rides down
the street" — dropping the anchoring details on the second shot leaves the
model free to regenerate a different-looking person entirely.
