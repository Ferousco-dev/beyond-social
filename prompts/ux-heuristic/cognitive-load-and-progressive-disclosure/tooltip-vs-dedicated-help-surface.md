---
id: cognitive-load-and-progressive-disclosure-tooltip-vs-dedicated-help-surface
title: Tooltip depth versus a dedicated help surface
category: ux-heuristic
subcategory: progressive-disclosure
tags: [tooltip, help-content, progressive-disclosure, cognitive-load]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A tooltip has room for one sentence and a few seconds of attention before it
feels like it's in the way; anything that needs a second sentence, a diagram,
or a worked example belongs on a dedicated help surface the tooltip links out
to, not stretched to fit the tooltip's frame.

The recipe:

- Cap tooltip copy at roughly one short sentence — what the control does and,
  if not obvious, why it matters. If it needs a "for example," it's not a
  tooltip anymore.
- Trigger tooltips on hover or long-press and dismiss them on the next
  interaction — they should never require an explicit close action, which
  would demote them from "glance" to "read."
- Link a tooltip's final clause to a help article or docs panel for anything
  with real depth ("Learn more about seed values →") instead of inflating the
  tooltip itself into a paragraph.
- Never put the only explanation of a required concept inside a tooltip — if a
  user must understand something to proceed safely, it needs a persistent,
  non-hover-gated surface, because tooltips are easy to miss entirely on touch
  devices.
- Match tooltip content to the control's actual ambiguity — a clearly labeled
  button needs no tooltip at all; adding one anyway just adds hover noise.

Why: a tooltip's entire value is its low commitment — it appears without a
click and disappears without one, so cramming multi-paragraph explanations
into it forces the user to either abandon reading mid-sentence or freeze their
mouse in an awkward hover just to finish a thought. Splitting short-answer
content into the tooltip and long-answer content into a linked help surface
respects that the two need different reading postures.

Example: a "Seed" field tooltip reads "Controls generation randomness — same
seed, same result. Learn more →" linking to a docs page with worked examples.

Counter-example: a tooltip on a "Guidance scale" slider containing four
sentences and a bulleted list of recommended values — by the time the user
finishes reading, the mouse has drifted and the tooltip has already vanished.
