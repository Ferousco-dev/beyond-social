---
id: accessibility-essentials
title: Accessibility essentials (WCAG AA)
category: accessibility
tags: [accessibility, wcag, contrast, keyboard, focus]
applicability:
  platforms: [web, mobile]
  productTypes: []
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Accessibility is a baseline requirement, not a pass at the end. The non-negotiable
set:

- Contrast: text meets WCAG AA, 4.5:1 for normal and 3:1 for large text and
  meaningful UI/icon boundaries. Verify computed values; do not eyeball.
- Focus: every interactive element has a visible, high-contrast focus state and a
  logical tab order. Never remove outlines without replacing them.
- Targets: at least 44x44px touch targets on mobile; adequate spacing so adjacent
  targets are not mis-tapped.
- Semantics and labels: real labels tied to inputs, buttons named by purpose,
  landmarks and headings in order, images with alt text (empty alt if decorative).
- Motion: honor reduced-motion; never convey meaning by color alone.

Why: this is both an ethical and legal baseline and it improves usability for
everyone (keyboard users, bright sunlight, one-handed use). Retrofitting it costs
far more than designing it in.

Example: 4.6:1 body text, a 2px focus ring on all controls, 48px mobile buttons,
inline labels. Counter-example: light-grey placeholder-as-label text at 2.8:1,
`outline: none`, and 30px tap targets packed together.
