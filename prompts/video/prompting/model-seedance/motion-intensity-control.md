---
id: model-seedance-motion-intensity-control
title: Controlling motion amplitude through prompt language
category: video-prompting
subcategory: model-seedance
tags: [seedance, motion, pacing, dynamics]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Seedance doesn't expose a single universal motion-strength slider in every
integration, so amplitude has to be set through prompt language, and vague
energy words undershoot or overshoot far more than concrete physical
description does.

The recipe:

- For subtle motion: name the specific small movement ("her hair shifts
  slightly in the breeze") rather than saying "gentle" or "subtle," which the
  model interprets inconsistently across scenes.
- For high energy: describe the physical cause of the speed ("sprinting, arms
  pumping") rather than adjectives like "fast-paced" or "dynamic," which tend
  to add camera shake without adding real subject motion.
- Pair a moving subject with a camera move in the same direction and speed to
  avoid the "treadmill" look, where the subject moves but the background
  barely responds.
- If the scene needs to hold mostly still, state what's actively still
  ("frozen mid-stride, only fabric moving in the wind") — an unqualified
  prompt tends to drift into aimless ambient sway by default.

Why: the model maps prompts to motion via the physical verbs and causes it saw
paired with that motion in training, so naming the mechanism (wind, sprint,
pour) gives it a concrete pattern to reproduce, while abstract intensity
adjectives get mapped inconsistently across different scene types.

Example: "Wind gusts through the wheat field, bending the stalks in waves; her
scarf whips sideways."

Counter-example: "Dynamic energetic movement, fast cinematic action" — no
physical cause is given, so the model typically responds by shaking the camera
rather than generating real subject motion.
