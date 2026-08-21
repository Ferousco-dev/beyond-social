---
id: screen-reader-and-aria-patterns-disclosure-accordion-pattern
title: Disclosures and accordions with aria-expanded
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, accordion, disclosure, aria-expanded, aria-controls]
applicability:
  platforms: [web]
  productTypes: [marketing-site, saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A single show/hide toggle (FAQ answer, filter panel) or a stack of them
(accordion) is a disclosure pattern, and its entire state lives in one
attribute on the trigger button, not on the content it reveals.

- The trigger is a real `<button>` (never a div or a link with `href="#"`) with
  `aria-expanded="false"|"true"` reflecting current state, and `aria-controls`
  pointing at the id of the region it toggles.
- The revealed region does not need its own ARIA role; a plain container hidden
  with the `hidden` attribute (not just `display:none` via a class the AT can't
  infer) or CSS keyed off the button's state is enough.
- Native `<details>`/`<summary>` gets `aria-expanded`-equivalent behavior for
  free and is the right default for a simple FAQ item with no animation
  requirements; reach for the custom button pattern only when the design needs
  animated height, multi-expand accordions with shared state, or grouped
  single-expand behavior.
- For an accordion (several disclosures grouped), decide up front whether
  multiple panels can be open at once or opening one closes the others — state
  the rule once and keep every panel's toggle logic consistent with it.
- Do not remove focus outline from the trigger button; it's the only visual cue
  for keyboard users mid-navigation of a long accordion list.

Why: `aria-expanded` is the single source of truth a screen reader reads aloud
("collapsed" / "expanded") when landing on the trigger; if it's absent or stale,
the user gets no indication the button does anything until they activate it.

Example: `<button aria-expanded="false" aria-controls="faq-1-answer">What's included in the free plan?</button>`.
Counter-example: a clickable heading with a chevron icon that rotates via CSS
but carries no `aria-expanded`, silent about its own state.
