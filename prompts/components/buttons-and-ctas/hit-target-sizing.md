---
id: buttons-and-ctas-hit-target-sizing
title: Minimum hit target sizing
category: component
subcategory: buttons-and-ctas
tags: [buttons, accessibility, mobile, sizing]
applicability:
  platforms: [web, mobile, ios, android]
  productTypes: [landing-page, saas-dashboard, mobile-app, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A button's clickable area must be sized for a finger or an imprecise cursor, not
for the visual size of its label — the tap target and the visible button are
two different boxes and only the first one has a hard minimum.

The recipe:

- iOS Human Interface Guidelines: minimum 44x44pt tap target.
- Material Design (Android/web): minimum 48x48dp tap target.
- If the visible button is smaller than the minimum (an icon button drawn at
  24px, for example), pad the hit area invisibly rather than shrinking the
  target — extend touch bounds beyond the visible box instead of enlarging the
  icon itself.
- Space adjacent targets at least 8px apart edge-to-edge; closer than that and
  mis-taps between neighboring buttons rise sharply, especially for users with
  motor impairments or anyone using the product one-handed on a moving bus.
- On mobile, keep primary actions inside the thumb-reachable zone (roughly the
  bottom two-thirds of the screen for one-handed use) rather than top corners.

Why: pointer precision is not evenly distributed across your users. Younger
hands, cold fingers, screen protectors, motion, and low vision all degrade
tap accuracy. A target below the platform minimum doesn't fail gracefully —
it produces mis-taps that read to the user as the app being broken, not as
their aim being off.

Example: a 24px trash icon rendered at 24px but wrapped in a button element
with 12px of padding on all sides, yielding a 48px hit box.

Counter-example: a row of three 20px icon buttons spaced 4px apart with no
padding — visually tidy, but nearly unusable on a phone, where taps regularly
land on the wrong icon.
