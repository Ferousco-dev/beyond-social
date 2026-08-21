---
id: reference-image-conditioning-multi-reference-conflicts
title: Resolving conflicts between a subject reference and an environment reference
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, multi-reference, subject-environment, compositing]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Combining a subject reference and a separate environment or product reference
only works when one image is designated the dominant geometry and the other
supplies attributes; treating both as equal spatial authorities produces
impossible perspective and scale mismatches.

- Pick one reference to set the camera's position, height, and lens, usually the
  environment plate, and describe the subject reference purely in terms of
  appearance (clothing, features, product design) rather than its own framing.
- Match scale and eyeline logic in the prompt explicitly when it isn't obvious
  from either image alone: "subject stands at normal height in this room,
  eyeline roughly at the window's lower third."
- Flag the lighting direction from the reference you're keeping as dominant and
  describe the other reference's subject as if lit by that same source; don't
  let both images bring their own separate light logic into one shot.
- Fewer references beat more: two conflicting authorities is manageable, three
  or four rarely resolves cleanly.

Why: the model has no built-in 3D scene understanding to reconcile two photos
taken with different cameras, distances, and lighting rigs into one consistent
space; it's pattern-matching each reference's 2D cues independently, so without
an explicit hierarchy it averages conflicting depth and light cues into a
flattened, slightly wrong-feeling composite.

Example: environment reference (empty cafe interior, camera at seated eye
height) sets the shot; subject reference (a person's face and outfit) described
only as "this person, seated at the near table, lit by the window light already
in the room."

Counter-example: feeding a studio headshot (flat frontal light, telephoto
compression) and a wide-angle street environment reference with no lighting or
scale instruction; the subject reads as visibly pasted-in, with mismatched
shadow direction and lens compression giving it away instantly.
