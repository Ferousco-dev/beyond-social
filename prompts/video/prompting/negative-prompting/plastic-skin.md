---
id: negative-prompting-plastic-skin
title: Excluding the beauty-filter, plastic-skin look
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, skin, realism, faces]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Generated skin defaults toward an airbrushed, poreless surface because that is
the statistical average of well-lit beauty and portrait photography in
training data. Real skin under real light shows texture, and its absence is
one of the fastest tells that a face is synthetic.

What to exclude, named specifically:

- "Waxy skin, poreless skin, airbrushed skin, beauty-filter smoothing" as
  literal negative terms, since "unrealistic skin" alone is too vague to steer.
- Uniform specular highlight across the whole face, which reads as a beauty
  filter's even sheen rather than light hitting actual contours.
- Perfectly even skin tone with no color variation at the nose, cheeks, or
  under the eyes.
- Pair the exclusion with a positive instruction for what should replace it:
  "visible pore texture, slight asymmetry, natural sheen on forehead and nose
  bridge only."

Why: skin is not one material but a layered, uneven one, oil concentrated at
the T-zone, dryness elsewhere, faint redness at the cheeks, fine vellus hair
catching sidelight. Diffusion-trained video models learn a smoothed average of
this because retouched portraiture dominates their training distribution;
naming the smoothing explicitly, rather than just asking for "realistic skin,"
gives the model a specific region of its output space to move away from.

Example: "exclude: airbrushed skin, poreless skin, uniform specular sheen;
include: visible pore texture, natural oil sheen limited to nose and forehead."
Counter-example: negative prompt "not fake looking skin." The model has no
fixed visual referent for "fake" and the output is statistically unchanged.
