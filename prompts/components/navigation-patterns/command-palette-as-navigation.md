---
id: navigation-patterns-command-palette
title: Command palette as a navigation layer for power users
category: component
subcategory: navigation
tags: [navigation, command-palette, saas-dashboard, keyboard]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A command palette (cmd/ctrl-K) is a navigation accelerator layered on top of a
sidebar or top nav, not a replacement for one — it serves users who already
know what they want and would rather type than scan a visual tree.

- Trigger with the platform-standard shortcut (Cmd+K on Mac, Ctrl+K on
  Windows/Linux) and a small, persistent visible affordance (a search-styled
  button in the top bar showing the shortcut hint) so non-keyboard users can
  find it too.
- Index three tiers of results in one flat, fuzzy-matched list: navigation
  destinations (pages/sections), actions (create, invite, export), and content
  (recent items, records) — ranked by recency and frequency of use per user.
- Always keep the full sidebar/tab bar navigation intact and equally capable of
  reaching every destination the palette can reach; the palette must be
  additive, never the only path to a feature.
- Close on Escape, on outside click, and on selection; never require the
  keyboard to dismiss it.
- Show recently visited or recently used items when the query is empty, so the
  palette is useful even before the user starts typing.

Why: expert users of complex dashboards navigate by intent ("go to billing,"
"create new project") faster through typed fuzzy search than through visual
scanning of a tree, but new users still rely on the visible hierarchy to build
a mental model of the product — remove the visible nav and you strand them.

Example: "Cmd+K opens a palette; typing 'invite' surfaces both the Team page
and an inline 'Invite teammate' action, ranked above unrelated matches."

Counter-example: an app that removes its sidebar in favor of a command palette
alone, leaving first-time users with a blank canvas and no visible way to
discover what the product contains.
