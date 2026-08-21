---
id: forms-and-inputs-choice-control-selection
title: Choosing between select, radio, segmented control, and checkbox
category: component
subcategory: forms-and-inputs
tags: [forms, radio, select, checkbox, controls]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, onboarding, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Each choice control trades visibility of options against space, and picking
the wrong one either hides options the user needed to compare or wastes space
showing options they didn't.

The recipe:

- Use radio buttons when there are 2-7 mutually exclusive options and screen
  space allows showing all of them at once — visibility of every option aids
  comparison before deciding.
- Use a segmented control instead of radio buttons when the options are short
  labels (2-4 words) representing a single setting, like a view toggle, since
  its compact horizontal layout reads as one control rather than a list.
- Switch to a native select (dropdown) only past ~7 options, or when vertical
  space is constrained and the options don't need side-by-side comparison
  (country picker, timezone).
- Use checkboxes, never a multi-select dropdown, when the user can choose more
  than one option — a standard select communicates "pick one" by convention,
  and repurposing it for multi-select breaks that expectation.
- On mobile, prefer a full-screen or bottom-sheet picker over a native
  multi-select or a long radio list, since scrolling a native select on
  touch is worse than a dedicated selection screen for anything past a few
  items.

Why: each control type carries an implicit convention about cardinality (pick
one vs pick many) and visibility (all options shown vs hidden behind a tap);
violating the convention forces the user to read carefully to figure out how
the control behaves instead of recognizing it instantly.

Example: shipping speed shown as 3 radio buttons with price beside each, so
the tradeoff is visible without a click; interests picker uses checkboxes.

Counter-example: a "select all that apply" interests picker built as a native
multi-select dropdown, where the user has no way to know multi-select is even
possible without ctrl/cmd-clicking, a gesture nothing on screen suggests.
