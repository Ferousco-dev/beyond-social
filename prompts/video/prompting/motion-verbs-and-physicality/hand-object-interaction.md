---
id: motion-verbs-and-physicality-hand-object-interaction
title: Grip verbs for hand-object interaction
category: video-prompting
subcategory: motion-verbs
tags: [hands, grip, artifacts, physicality]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Hands are the zone where generation artifacts concentrate hardest, so a named
grip plus a named verb both fights the "AI look" and narrows the pose space the
model has to resolve.

The recipe:

- Name the grip, not just the contact: pinch, cup, clutch, palm, hook two
  fingers through a handle.
- Name the transition verb precisely: picks up, sets down, slides, nudges,
  tosses, hands off.
- Keep the action to one clear beat instead of a continuous, open-ended fidget.
- Anchor the object's resting state before and after: where it starts, where it
  lands, and how it sits there.

Why: hands are high-detail, high-degree-of-freedom subjects, and a vague
instruction like "interacts with the phone" invites the model to average across
many plausible hand poses across the shot's duration, which is exactly how
warping, extra fingers, and object clipping happen. One named grip and one named
verb constrains the pose to a single, learnable pattern instead of an open set.

Example: "he pinches the phone between two fingers and sets it face-down on the
table."
Counter-example: "he fiddles with the phone" — open-ended and continuous, which
invites multi-pose ambiguity and the finger and object warping that comes with
it.
