---
id: negative-prompting-symmetry-centering
title: Excluding perfect symmetry and dead-center framing
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, composition, framing, symmetry]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Unprompted generations gravitate toward a subject dead-center in frame with
mirror-symmetric composition, because that is the easiest configuration for
the model to render coherently. Real cinematography almost never centers a
subject exactly; a human operator's hand-held or even locked-off framing
carries small, motivated offsets.

What to exclude and what to specify instead:

- Exclude "perfectly centered subject, mirror symmetry, dead-center
  composition" as literal terms.
- Specify an actual compositional rule in the positive prompt so the model has
  something to do instead of default-centering: "subject on the left third,
  headroom trimmed to a third of a head."
- Exclude "evenly balanced background elements on both sides," which is the
  symmetry failure extended to set dressing, not just the subject.
- For two-shots, exclude "subjects equidistant from frame edges" and specify
  an actual foreground/background depth offset instead.

Why: rule-of-thirds and deliberate off-center framing exist in real
cinematography because a human operator is composing around a specific
subject and background relationship, not centering by default; perfect
symmetry is what happens when no one made a framing decision, which is exactly
the tell that reads as generated rather than shot.

Example: "subject positioned on the right third of frame, negative space to
the left, background slightly out of alignment with foreground subject."
Counter-example: "perfectly symmetrical, centered composition, balanced on
both sides" — a description that asks for the default failure mode by name.
