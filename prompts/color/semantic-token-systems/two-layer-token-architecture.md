---
id: semantic-token-systems-two-layer-token-architecture
title: Separate primitive palette tokens from semantic role tokens
category: color-system
subcategory: token-architecture
tags: [tokens, architecture, semantic-color, design-tokens]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A token system needs two distinct layers: primitives (raw palette values like
`blue-600` or `red-500`) and semantics (`danger-fg`, `success-bg`) that point at a
primitive. Components consume only semantic tokens, never primitives directly.

- Layer 1, primitives: numbered ramps per hue, no meaning attached, e.g.
  `red-50` through `red-900`.
- Layer 2, semantics: role names that alias a primitive step, e.g.
  `--danger-fg: var(--red-600)`.
- Components reference `--danger-fg`, never `--red-600` or `#DC2626` directly.
- Swapping a theme, or shifting the whole danger hue, means editing one alias
  line, not hunting through components.
- Keep the alias indirection even when primitive and semantic values start out
  identical, one-to-one aliasing on day one is what makes divergence possible
  later.

Why: the moment a component hardcodes a primitive, the system has two sources
of truth for "danger" and they will drift the first time someone patches a
button in isolation. The alias layer is what lets a rebrand, an accessibility
contrast fix, or a dark-mode remap happen as a single edit instead of a
grep-and-replace across the codebase. It also lets designers and engineers
talk about "danger" as a stable concept even while the underlying hex value
changes across versions.

Example: `--red-600: #DC2626;` in the primitive layer, then
`--color-danger-fg: var(--red-600);` in the semantic layer, then
`.delete-button { color: var(--color-danger-fg); }` in the component.
Counter-example: `.delete-button { color: #DC2626; }` written directly in
component CSS, no primitive or semantic layer, so a later contrast fix
requires searching every file for that hex string.
