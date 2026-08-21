---
id: pairing-and-scale-systems-optical-size-axis
title: Optical size axis across the scale
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, scale, variable-fonts, optical-sizing]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, marketing-site, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Variable fonts with an optical-size (opsz) axis draw a genuinely different
letterform for display sizes versus text sizes, not just a resized version, so
a scale spanning both display and body should use the axis rather than one
static cut stretched across every step.

- Text-optical cuts have larger x-heights, more open counters, and looser
  spacing, tuned for legibility at 12 to 18px.
- Display-optical cuts have tighter spacing, more contrast between thick and
  thin strokes, and finer details that only read correctly at 30px and up.
- Typefaces built this way: Amstelvar, Recursive, Roboto Flex, Source Serif 4,
  each with an explicit opsz axis controllable via font-variation-settings.
- If the family has no opsz axis, approximate it manually: tighten
  letter-spacing and increase stroke contrast only at display sizes, don't
  apply the same tracking value across the whole scale.

Why: a single static design optimized for one size range looks either too
delicate when blown up or too heavy and cramped when shrunk down, because
letterform proportions that read well at 14px are not the proportions that
read well at 64px. The same source drawing cannot serve both without an opsz
axis or manual compensation.

Example: "font-variation-settings: 'opsz' 14 for body copy, 'opsz' 72 for the
hero headline, same family, same weight axis position."

Counter-example: setting a single static text-optimized font file at 72px for
a hero headline, producing thin, slightly fuzzy strokes that were never drawn
to be seen that large.
