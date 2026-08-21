---
id: pairing-and-scale-systems-monospace-pairing
title: Pairing monospace for code and data
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, pairing, monospace, code]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Pair a monospace face with the UI sans specifically for content where
character-by-character alignment carries meaning, code, API keys, hashes,
terminal output, diffs, not as a general accent font for stylistic variety.

- Choose a mono face designed for screen legibility at small sizes (JetBrains
  Mono, Berkeley Mono, IBM Plex Mono), not a generic system monospace, which
  often has poor spacing at 12 to 13px.
- Match the mono face's cap-height and weight to the surrounding sans so
  inline code doesn't jump out in size or visual weight, only in form.
- Reserve tabular monospace treatment for genuinely tabular content; don't set
  prose or marketing copy in mono for a "technical" look, it hurts reading
  speed with no compensating benefit.
- Give mono blocks a distinct background or border rather than relying on the
  font swap alone to signal "this is code," since a font change is a subtle
  cue that's easy to miss while scanning.

Why: monospace exists to make every character occupy identical width, which is
only valuable when position and alignment carry information, a diff, a table
of hashes, a terminal. For regular prose that same constraint only worsens
word-spacing and justification, so mono earns its place through its
structural property, not through the aesthetic of looking technical.

Example: an API key displayed in JetBrains Mono 14px inside a bordered,
light-gray code chip, inline with Inter 14px body copy.

Counter-example: setting an entire "how it works" marketing section in
monospace because it "feels developer-y," making three paragraphs noticeably
harder to read for no functional reason.
