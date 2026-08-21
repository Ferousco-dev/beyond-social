---
id: match-cuts-and-continuity-time-of-day-weather
title: Time of day and weather continuity
category: editing
subcategory: continuity
tags: [time-of-day, weather, sun-position, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Sun angle and weather function as the viewer's clock; an unmotivated shift between
clips silently tells the audience time is behaving inconsistently, which reads as
a production error even when no single shot looks wrong in isolation.

- Decide the story's implied timeframe before generating anything, such as a
  single unbroken afternoon, and lock sun position and weather to that timeframe
  across every clip.
- If real time is meant to pass, show the change deliberately, with a time-lapse
  transition, a lit lamp, or longer shadows, rather than letting sky and shadow
  drift by accident between separate generation calls.
- Match cloud cover and precipitation state too; a damp street in one clip and dry
  pavement in the next contradicts the implied weather even if lighting matches.
- Treat golden hour or blue hour as a hard constraint: that window is short, so
  plan how many "different" clips can plausibly share it before generating.

Why: the visual system uses shadow length and sky quality to infer elapsed time
almost automatically, so a sequence that silently jumps from midday to golden hour
reads as broken continuity even to a viewer who never consciously checks the sky.

Example: "overcast, flat light, damp pavement" held identically across every
exterior clip in the sequence.
Counter-example: harsh midday sun in the establishing shot and soft golden-hour
light in the coverage two shots later, with no transition to explain the change.
