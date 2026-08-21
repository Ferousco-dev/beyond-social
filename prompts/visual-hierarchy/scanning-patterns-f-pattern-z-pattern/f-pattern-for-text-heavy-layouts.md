---
id: scanning-patterns-f-pattern-z-pattern-f-pattern-for-text-heavy-layouts
title: The F-pattern for text-heavy layouts
category: visual-hierarchy
subcategory: scanning-patterns
tags: [f-pattern, eye-tracking, reading-behavior, content-layout]
applicability:
  platforms: [web, mobile]
  productTypes: [blog, landing-page, marketing-site, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

On text-dense pages (articles, search results, long-form docs) eye-tracking shows
two to three horizontal sweeps that get shorter each time, decaying into a
vertical scan down the left edge, tracing a rough F. Content further down and
further right gets read less with each successive row.

The recipe:

- Put the single most important sentence of any paragraph in its first line,
  left-aligned.
- Front-load headings with the keyword or benefit word; cut filler like "the"
  or "how to" from the opening.
- Keep the left margin a strict vertical rail; staggered indentation breaks the
  anchor scanners rely on for the vertical leg of the F.
- Assume anything past the first 2-3 words on a third-or-later row is skimmed,
  not read.
- Bold phrases sparingly as re-entry points on rows the eye is about to skip
  past entirely.

Why: the F-pattern is a bail-out heuristic, not sequential reading. The reader
is deciding early whether the content is worth the time, sampling left-edge
words as a relevance and effort check. Structure has to reward that check, not
just be logically ordered for someone who reads every word.

Example: an H2 reading "Ship weekly. Not quarterly." leads with the payoff word.
Counter-example: an H2 reading "In this section, we will discuss how our
platform enables you to ship weekly" buries "weekly" at word twelve, past where
a decaying third-row scan still resolves text.
