---
id: cognitive-load-and-progressive-disclosure-generation-parameter-disclosure
title: Progressive disclosure of video generation parameters
category: ux-heuristic
subcategory: progressive-disclosure
tags: [progressive-disclosure, video-composer, cognitive-load, parameters]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, product-video, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A video generation composer has three natural tiers of parameter — what most
prompts need, what a deliberate creative choice needs, and what only a
technical troubleshooting session needs — and the interface should surface
exactly one tier by default, not flatten camera, lighting, and model internals
into a single parameter list.

The recipe:

- Tier one, always visible: prompt text, duration, aspect ratio — the minimum
  needed to generate anything at all.
- Tier two, one disclosure click away: camera behavior (push-in, static,
  handheld), lighting description, and shot framing — creative controls a
  deliberate user reaches for, grouped under "Camera & Lighting," not buried
  individually.
- Tier three, a second disclosure or an explicit "Advanced" label: seed value,
  negative prompt, guidance scale, model version pin — parameters that exist
  for reproducibility and troubleshooting, not everyday composition.
- Show the current non-default values as small inline chips next to the
  disclosure trigger ("Camera & Lighting (2 set)") so a collapsed tier doesn't
  hide the fact that it's already been customized.
- Reset tier-two and tier-three values to their defaults when the tier-one
  prompt changes substantially, rather than silently carrying stale camera
  settings onto an unrelated new prompt.

Why: the three tiers map to three different users at three different moments —
someone testing an idea, someone composing a specific shot, and someone
debugging why a render didn't match expectations — and none of them benefit
from seeing the other two tiers' controls while they're focused on their own.

Example: "Camera & Lighting ▾" collapsed by default, expanding to reveal push-in
/static/handheld and a lighting-description field, with "Advanced ▾" below it
holding seed and negative prompt.

Counter-example: one long form listing prompt, duration, aspect ratio, camera
move, lighting, seed, guidance scale, and model version in a single unbroken
column — a first-time user has to scroll past six fields they don't understand
to find the Generate button.
