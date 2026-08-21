---
id: negative-prompting-cgi-cloth-physics
title: Excluding CGI-smooth cloth and hair physics
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, cloth, hair, physics]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Generated fabric and hair tend to move as a single smooth, low-friction sheet,
flowing evenly with no catch points, closer to a cloth simulation with
simplified stiffness than real fiber. Real fabric has friction against itself
and the body underneath it, and real hair has strands that separate, catch,
and fly individually rather than moving as one mass.

What to exclude and the physical vocabulary to specify instead:

- Exclude "silky uniform cloth flow, weightless fabric, hair moving as a
  single mass" as literal terms.
- Specify actual fabric behavior tied to material: "cotton with visible
  creasing at the elbow, fabric catching slightly on the shoulder during
  turn," since naming a real material gives the model a friction reference
  a generic "fabric" does not.
- Exclude "perfectly settled hair with no flyaways," the tell of hair
  rendered as a solid volume instead of individual strands responding to
  air movement.
- For wind or fast motion specifically, exclude "cloth and hair moving in
  unison at identical speed," since real hair is lighter and lags or leads
  fabric rather than moving in lockstep with it.

Why: cloth and hair are made of many independent elements with friction and
differing mass, so their real motion is never uniform; a model that has
learned an averaged, smoothed simulation of "fabric moving" produces a
visibly synthetic sheet-like flow the moment motion or wind is introduced,
and the fix is to keep pointing it at the physical cause, mass and friction,
not just the smooth symptom.

Example: "denim jacket, visible creasing across the back during arm movement,
hair strands separating and catching in the wind at different speeds."
Counter-example: "flowing, silky hair and fabric in the wind" — a request for
the uniform, weightless default, phrased as a style note.
