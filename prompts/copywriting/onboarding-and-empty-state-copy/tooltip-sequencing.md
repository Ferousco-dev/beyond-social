---
id: onboarding-and-empty-state-copy-tooltip-sequencing
title: Coachmarks teach one decision at a time, in the order the UI is used
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [tooltip, coachmark, onboarding, sequencing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A first-run tooltip sequence should map to the order a user actually touches
controls to complete one task, and each tooltip should teach a single
decision, not describe a UI element.

- Anchor tooltip one to the first control the user needs, not the most
  visually prominent one.
- Write the copy as an instruction to act, with the reason folded in: "Drop a
  reference image here to keep the character's face consistent across shots,"
  not a label like "This is the reference image slot."
- Cap the sequence at three to four steps. Anything the user hasn't touched by
  step five is better taught contextually, on their first real encounter with
  that control.
- End the sequence on the action that produces the payoff, so the last thing
  the user reads is followed immediately by seeing a result.
- Let any step be dismissed without losing access to the rest of the product.
  A coachmark that blocks the canvas until finished teaches avoidance, not the
  feature.

Why: explaining structure ("this panel controls shots") gives the user a fact
to forget. Explaining a decision at the moment it's needed ("choose two to
three shots for a fifteen-second video") gives them a rule they can reuse
unprompted the next time they're in that exact spot, which is what actually
sticks after the tooltip disappears.

Example: "Add a second shot here to cut to a close-up mid-video. Most
fifteen-second ads use two or three shots."
Counter-example: "This is the Shots panel. You can add, remove, and reorder
shots here." This names the UI element and teaches nothing about when or why
to use it.
