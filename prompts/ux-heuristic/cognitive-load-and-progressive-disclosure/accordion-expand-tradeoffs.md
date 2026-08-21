---
id: cognitive-load-and-progressive-disclosure-accordion-expand-tradeoffs
title: When accordions help and when they hide too much
category: ux-heuristic
subcategory: progressive-disclosure
tags: [accordion, progressive-disclosure, cognitive-load, interaction-pattern]
applicability:
  platforms: [web, mobile]
  productTypes: [marketing-site, saas-dashboard, blog]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Accordions trade discoverability for density — collapsing content saves vertical
space at the cost of hiding it from scanning and from the browser's find-in-page,
which makes them the right tool for reference content and the wrong one for
anything the user needs to compare across sections.

The recipe:

- Use accordions for parallel, self-contained items the user consults one at a
  time — FAQ entries, plan-comparison footnotes, changelog entries — never for
  content the user must read in sequence to understand.
- Show the answer to the single most common question expanded by default; an
  all-collapsed accordion forces even the majority use case through an extra
  click.
- Keep the closed-state label specific enough to answer "should I open this,"
  not a generic "Details" — a label that requires opening the panel to know if
  it's relevant defeats the point of collapsing it.
- Avoid accordions for content the user needs to compare side by side (pricing
  tiers, spec sheets); collapsing forces them to hold the first panel's values
  in memory while reading the second.
- Skip the animation delay past roughly 200ms — a sluggish expand reads as the
  UI ignoring the click, and users double-click, which then re-collapses it.

Why: collapsing content is a bet that most users won't need most sections most
of the time. That bet is correct for reference material people dip into
selectively, and wrong for anything that requires cross-referencing, because
closed accordions actively work against comparison by hiding the very content
being compared.

Example: an FAQ page with "Do you offer refunds?" pre-expanded and the other
eleven questions collapsed with specific, scannable question-text labels.

Counter-example: a pricing page that puts each plan's feature list inside a
collapsed accordion — comparing "Pro" and "Team" now requires opening one,
memorizing it, closing it, then opening the other.
