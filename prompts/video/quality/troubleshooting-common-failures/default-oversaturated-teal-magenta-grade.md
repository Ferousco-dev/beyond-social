---
id: troubleshooting-common-failures-default-oversaturated-teal-magenta-grade
title: "Symptom: unprompted color defaults to an oversaturated teal-magenta look"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [color-grade, saturation, default-look, white-balance]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Symptom: with no grade specified, output skews toward a punchy, oversaturated
palette leaning teal in shadows and magenta or amber in skin and highlights —
a generic, slightly synthetic-looking default rather than anything a
colorist chose. It's not wrong exactly, it's the model's mean color response,
and it reads as templated because it is.

- Never leave color unstated on a shot that matters; an unspecified grade
  isn't neutral, it's a specific over-saturated default, so treat naming a
  palette as mandatory, not optional polish.
- Anchor to a white balance and a film stock or camera reference rather than
  an abstract mood word: "neutral daylight white balance, slightly
  desaturated, like Kodak Portra stock" gives the model a concrete visual
  target instead of "vibrant colors," which invites the oversaturated default.
- Pull saturation down explicitly when the default look shows up: "muted,
  slightly desaturated palette, lifted blacks" actively counters the
  tendency rather than hoping a mood word will.
- Separate skin tone from environment color: specify that skin should stay
  natural and warm while background elements can carry more of the palette's
  color, since the default failure often oversaturates skin into an
  artificial magenta-orange along with everything else.
- Cross-check against the intended brand or platform palette (see color
  grading looks) rather than accepting whatever the model returns
  unprompted; the default is a starting point to correct, not a finished look.

Why: the model's color output regresses to the mean of its training
distribution, which skews toward punchy, commercially-graded footage; that
mean is recognizable as "AI color" specifically because it's nobody's actual
creative choice, so a named, concrete reference is what makes the grade read
as intentional.

Example: "neutral daylight white balance, desaturated filmic palette, warm
natural skin tone, lifted shadows."
Counter-example: leaving color unspecified and asking only for "vibrant,
eye-catching colors."
