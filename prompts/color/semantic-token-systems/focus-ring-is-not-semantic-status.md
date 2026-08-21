---
id: semantic-token-systems-focus-ring-is-not-semantic-status
title: Keep the focus ring token separate from the semantic status set
category: color-system
subcategory: token-architecture
tags: [focus-ring, accessibility, semantic-color, tokens]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

Focus and selection states are interaction tokens, not status tokens, and
folding a focus ring into the "info" or "primary" semantic role, rather than
giving it a dedicated `--focus-ring` token, is a common source of
accidental double meaning.

- Define `--focus-ring` as its own token, typically derived from the primary
  accent but distinct enough (often lower opacity, a fixed alpha value) that
  it never gets reused for an info banner or a link color by accident.
- Never let a component's danger or warning state override the focus ring
  color, a focused invalid field needs both the error color on the field
  itself and a visible focus ring, layered, not merged into one token.
- Verify the focus ring token passes the non-text 3:1 contrast requirement
  against both light and dark surfaces independently, since it is a
  frequently under-tested token.
- Keep the focus ring token theme-aware (it needs its own light/dark values)
  even if visually it is "just" a thin outline, low-contrast focus rings are
  a common accessibility failure caught late.

Why: a token that means two different things in two different contexts
(interactive-focused vs. informational) will eventually get pulled into the
wrong context by someone who only knows it by its color, not its intended
role, because token systems get read by name and by eye, not by an
authoritative spec everyone has memorized. A dedicated, unambiguous focus
token removes that risk entirely.

Example: `--focus-ring: rgba(0, 102, 255, 0.5)` used only for `:focus-visible`
outlines, kept distinct from `--info-solid: #2563EB` even though both derive
from the same base blue.
Counter-example: reusing `--info-solid` directly as the focus ring color, so
a focused form field and an informational banner share the exact same token,
and a later change to "info" silently changes every focus ring in the app.
