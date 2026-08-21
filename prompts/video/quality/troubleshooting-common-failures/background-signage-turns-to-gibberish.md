---
id: troubleshooting-common-failures-background-signage-turns-to-gibberish
title: "Symptom: background text and signage render as gibberish"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [text, signage, background, legibility, environment]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Symptom: street signs, menu boards, storefronts, or screens visible in the
background come out as pseudo-letters, a smear that almost reads as words but
isn't. It's rarely the foreground subject that breaks a shot's credibility;
it's an unreadable sign sitting in frame that a viewer's eye catches on.

- Don't ask for readable background text unless it is the point of the shot;
  a generic instruction like "busy city street with shop signs" invites the
  model to invent lettering it can't render, so specify "storefronts with
  indistinct signage" or push them soft-focus.
- Put a shallow depth of field between the camera and any background text:
  "background softly out of focus" makes illegibility look like an
  intentional lens choice (bokeh) rather than a rendering failure.
- If a specific sign must be legible (a store name, a street sign that
  matters to the story), treat it like a logo: source it from a reference
  image and instruct the model to preserve it exactly, rather than describing
  it in words.
- Keep busy text-bearing backgrounds out of the depth of field entirely when
  possible — a longer lens and wider aperture (85mm-equivalent, shallow
  focus) throws the background into a blur where letterforms never resolve
  and never need to.
- Favor environments with minimal signage (a park, a plain interior, an
  empty street) when the location itself isn't the story; every readable
  surface in frame is a chance for gibberish.

Why: the model renders text as texture, not as symbols, so any background
detail with expected legibility is a high-risk zone; controlling focus and
distance turns an unavoidable rendering weakness into a deliberate
cinematographic choice.

Example: "walking down a city street, storefronts and signage softly out of
focus behind her, shallow depth of field."
Counter-example: "detailed shopping street with readable store names and
menu boards in the background" — a direct request for a failure mode.
