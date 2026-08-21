---
id: character-consistency-across-shots-skin-texture
title: Fix skin texture and blemish markers, don't let the model choose smoothness
category: video-quality
subcategory: character-consistency
tags: [character-consistency, skin-texture, realism, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Left unspecified, generation models default toward smoothed, airbrushed skin, and
the amount of smoothing varies shot to shot with no consistent rule, which both
breaks identity continuity and produces the plastic "AI look" this product is trying
to avoid. Skin texture needs to be specified and held fixed, same as hair or wardrobe.

The recipe:

- Name real texture explicitly: visible pores, faint under-eye texture, a few
  individual freckles at named locations, natural asymmetric skin tone rather than
  perfectly even coverage.
- If the character has a specific blemish or texture feature (a small scar, acne
  texture on one cheek, faint sun freckling across the nose), treat it as a fixed
  marker and repeat it in every shot prompt, same as a mole in the distinguishing-
  marks technique.
- Explicitly reject over-smoothing in the prompt language ("natural skin texture, not
  airbrushed, visible pores") rather than assuming the model will default to realism.
- Keep texture description consistent with the lighting spec: harder key light should
  reveal more texture than soft diffused light, and the prompt should say so, so
  texture visibility doesn't randomly swing between shots lit the same way.
- Review close-ups specifically for texture consistency; texture drift is invisible
  in wide shots and only becomes obvious once the face fills the frame.

Why: default model output biases toward an idealized, smoothed skin because that
pattern is overrepresented in training data tagged as high-quality, but real skin
under real light always shows some texture, and inconsistent smoothing both breaks
character continuity and is one of the fastest visual tells of synthetic footage.

Example: "natural skin texture, visible pores, faint freckling across the nose, not
airbrushed" repeated in every close-up prompt for the character.
Counter-example: no texture guidance at all, resulting in glass-smooth skin in the
wide shot and suddenly visible pores in the close-up, with no lighting reason for
the change.
