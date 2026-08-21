---
id: character-consistency-across-shots-distinguishing-markers
title: Anchor with distinguishing marks, not generic beauty language
category: video-quality
subcategory: character-consistency
tags: [character-consistency, facial-features, prompting, identity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Adjectives like "beautiful" or "striking" give the model nothing concrete to hold
constant across shots; they describe an impression, not a shape. A specific,
asymmetric, real-feeling marker does the anchoring work that generic praise can't.

The recipe:

- Pick one or two fixed physical markers: a mole's approximate location, a slight
  gap between front teeth, a faint scar, an asymmetric brow arch, a dimple on one
  side only.
- State the marker's location precisely enough to be checkable: "small mole above the
  right corner of the mouth," not "a beauty mark."
- Prefer asymmetric markers over symmetric ones; asymmetry is what a viewer's eye
  actually uses to recognize a specific face, and it is also what generic "attractive
  person" training data underrepresents, so naming it counteracts the model's pull
  toward a symmetrical average face.
- Drop purely evaluative adjectives ("gorgeous," "handsome," "stunning") from the
  identity clause entirely; they add tokens without adding anchoring information and
  can nudge the model toward a generic idealized face instead of the specific one.
- Recheck the marker in every generated shot during review, the same way a continuity
  checker would flag a missing scar in a reshoot.

Why: recognizability is driven by specific, often asymmetric detail, not by
aggregate attractiveness, and generic descriptors give the sampler no fixed point to
converge on, so it drifts toward whatever an "attractive person" looks like in the
training distribution instead of toward one particular person.

Example: "small mole above the right corner of the mouth, slightly asymmetric smile."
Counter-example: "a beautiful, striking woman with a perfect smile" — no anchor, and
a new "perfect" face every render.
