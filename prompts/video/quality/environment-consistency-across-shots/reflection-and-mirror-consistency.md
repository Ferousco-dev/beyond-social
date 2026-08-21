---
id: environment-consistency-across-shots-reflection-and-mirror-consistency
title: Controlling what reflective surfaces show
category: video-quality
subcategory: background-continuity
tags: [reflections, mirrors, continuity, physics]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Reflective surfaces — mirrors, windows, glossy tables, glass — need to show
content consistent with the stated room, or they become an obvious tell that
the environment isn't a coherent physical space.

The recipe:

- If a mirror or window sits in frame, describe what it reflects explicitly,
  and match that description to the room layout stated elsewhere in the
  prompt.
- Minimize large reflective surfaces in generated environments unless a shot
  specifically needs one; each one multiplies the chance of an impossible
  reflection.
- For glossy surfaces (countertops, phone screens, sunglasses), expect the
  model to default to a generic blur or an unrelated scene — prompt for a
  plausible, simple reflected element (a soft window-light bloom) instead of
  leaving it to chance.
- If a mirror reflected the window in shot 1, keep that same reflected content
  in any later shot that shows the same mirror.

Why: reflections are a physics constraint real cinematographers actively
manage (keeping crew and lights out of mirror shots), and generative models
have no true 3D scene graph to enforce them automatically. That makes
reflections one of the highest-risk elements for breaking the illusion of a
single, real physical space.

Example: "large window behind subject, reflected faintly and consistently in
the dark laptop screen on the desk, in every shot showing that desk."
Counter-example: prompting a bathroom mirror shot with no reflection
guidance — the model renders a reflection of an unrelated room, or a subject
whose reflection faces the wrong way.
