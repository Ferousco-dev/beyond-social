---
id: emotional-arcs-in-15-seconds-external-trigger-for-the-turn
title: The turn needs a visible, external cause
category: narrative
subcategory: causality
tags: [causality, motivation, turn, staging]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

An emotional turn compressed into one or two seconds only reads as real if something visible in the frame causes it. A character who simply decides to feel differently, with no triggering event, looks like a rendering glitch rather than a person.

- Give the turn a physical cause: an object enters frame, a phone lights up and the screen is legible, a person appears in the background, a door opens, ambient sound changes and something on screen reacts to it.
- Put the cause and the reaction inside the same shot when possible, or split it into a strict cause-shot then reaction-shot pair.
- Name the cause explicitly in the prompt rather than only naming the resulting emotion.
- Never describe an expression change without describing what triggers it in the same sentence.

Why: viewers process causality almost instantly, and a face that shifts with no visible source reads as uncanny rather than moving, because the brain expects an event to explain a state change within about the same window it takes to notice the change itself. This is also one of the more common failure signatures of generated video, where an expression drifts across a held shot with nothing motivating it, so the fix here is also an anti-artifact fix.

Example: "a hand sets a photograph face-up on the table; cut to her face reacting to what she sees."
Counter-example: "she stares into the middle distance and slowly starts to smile" with no described cause, which a generator will render as an unmotivated drift that reads as an error, not a feeling.
