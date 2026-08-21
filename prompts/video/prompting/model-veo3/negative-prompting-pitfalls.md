---
id: model-veo3-negative-prompting-pitfalls
title: Naming what to avoid still raises the odds it appears
category: video-prompting
tags: [negative-prompt, syntax, pitfalls, prompt-structure]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Veo 3, like most text-to-video models, treats a mentioned concept as present
in the conditioning whether it's framed as "include" or "avoid." Writing "no
crowd" or "without text on screen" still names the noun, and naming it still
raises the odds it shows up.

Practice:

- State the desired state positively instead of negating the unwanted one:
  "empty street" instead of "no people," "clean unmarked packaging" instead
  of "no logos or text."
- If a real negative-prompt or exclusion field exists in the generation tool,
  put excluded terms there rather than in the main scene description; that
  field is handled differently from the narrative prompt.
- When something keeps appearing despite negation, remove the word entirely
  rather than negating it harder: "absolutely no crowd, empty, no people at
  all" tends to make it worse, not better.
- Reserve negation, where a real exclusion field exists, for genuinely
  unwanted artifacts like extra limbs or warped text, and keep the main
  prompt entirely affirmative about what should be in frame.

Why: the layer that parses the prompt attends to the nouns present in the
text largely regardless of the polarity wrapped around them, so "no dog"
still activates "dog" in the conditioning. This is a well-documented failure
mode across diffusion and video generators generally, not a quirk that
careful negation phrasing reliably works around.

Example: "An empty, quiet loading dock at dawn, no other detail needed."
Counter-example: "a loading dock with no workers, no forklifts, no crates,
nothing else in frame." Four negated nouns, several of which are prone to
appearing anyway.
