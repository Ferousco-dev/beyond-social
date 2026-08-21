---
id: match-cuts-and-continuity-wardrobe-and-prop-state
title: Wardrobe and prop state continuity
category: editing
subcategory: continuity
tags: [props, wardrobe, continuity, script-supervision]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Every visible prop or wardrobe detail that could logically change between shots
needs its state tracked and either held constant or changed on purpose, the same
job a script supervisor does with continuity polaroids on a physical set.

- Track the state of anything that could plausibly change: drink fill level, papers
  on a desk, a jacket buttoned or open, a watch's position on the wrist.
- Freeze props that should not change by describing their exact state in every
  clip's prompt ("espresso cup half full, saucer to the right").
- Where state should progress (a cup emptying, ice melting) show the change
  deliberately and describe the delta; do not let it happen at random between
  independent generations.
- Sketch or photograph a simple prop and wardrobe continuity sheet before
  generating the sequence, then paste the relevant state into each clip's prompt.

Why: prop errors are the classic viewer-spotted "goof" in traditional editing, and
on AI-generated footage they compound, because there is no physical object holding
its own state between takes, only whatever the prompt reasserts each time.

Example: clip one specifies "espresso cup half full, saucer to the right"; clip
two reuses that exact line unless the story shows a sip being taken.
Counter-example: the cup is full in the wide shot and empty in the following
close-up with no drinking action ever shown on screen.
