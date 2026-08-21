---
id: semantic-token-systems-token-naming-convention
title: Use a fixed role-suffix naming grammar for semantic tokens
category: color-system
subcategory: token-architecture
tags: [naming, tokens, semantic-color, conventions]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Token names should follow one fixed grammar, `{role}-{variant}`, so anyone
reading `success-fg` or `danger-solid` immediately knows both what it means
and how it is meant to be used, without opening the token file.

- Fixed role set: `success`, `warning`, `danger`, `info`, applied
  consistently, never `error` in one place and `danger` in another for the
  same concept.
- Fixed variant suffixes: `-bg`, `-border`, `-fg`, `-solid`, `-solid-fg` (text
  color for use on the solid fill), applied identically across all four
  roles.
- Never encode a literal color name in a semantic token, `danger-red` or
  `warning-orange` breaks the moment the underlying hue changes, which
  defeats the purpose of tokenizing at all.
- Never encode a specific component in a semantic token name, `button-danger`
  couples the token to one use site, prefer `danger-solid` used by any
  component that needs a solid danger fill.

Why: naming inconsistency compounds silently, a team that has both `error-`
and `danger-` prefixes for the same concept will eventually have two
divergent scales for the same status, because two engineers built each one
without realizing the other existed. A single grammar, enforced in code
review or a lint rule, keeps the whole token set legible to a new engineer on
day one without a glossary.

Example: `--danger-bg`, `--danger-border`, `--danger-fg`, `--danger-solid`,
`--danger-solid-fg`, the same five-suffix pattern repeated for `success`,
`warning`, and `info`.
Counter-example: a codebase with `--error-color`, `--warning-bg-color`,
`--success500`, and `--info-text`, four different naming patterns for four
roles, none of which predict the others.
