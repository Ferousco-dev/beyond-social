---
id: cards-and-lists-status-badges
title: A closed vocabulary for status badges
category: component
subcategory: cards-and-lists
tags: [status, badges, color, design-system]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Status badges need one small, closed vocabulary with a fixed color-to-meaning mapping, defined centrally and reused everywhere — not invented per feature.

- Define a single status taxonomy once (draft / processing / ready / failed / archived, or whatever fits the domain) and reuse it across every list in the product rather than letting each feature name its own states.
- Reserve semantic colors exclusively for status: red only ever means error/failed, amber only ever means in-progress/attention, green only ever means success/ready — never repurpose these hues decoratively elsewhere in the same product.
- Pair color with a text label or distinct icon shape, never color alone — colorblind users and quick vibe-scanning both fail on color-only badges.
- Keep badge text to one or two words, present tense, no trailing punctuation: "Processing," not "Currently being processed…".
- If real progress data exists, reflect it (a percentage, elapsed time) instead of a static "Processing" that gives no sense of how much longer it will take.

Why: a status badge is a promise about system state the user will act on — retry, wait, or share. When the vocabulary or color mapping drifts between screens, the user has to re-learn the meaning every time they hit a new list, and any collision between a status color and a decorative use of that same hue (a brand-blue "featured" tag next to a status-blue "processing" tag) actively misleads triage rather than merely confusing it.

Example: "badges: Draft (gray), Processing (amber, pulsing dot), Ready (green), Failed (red) — identical words and colors everywhere in the app."
Counter-example: one list uses red for "Needs review" while another uses red for "Failed" — a user pattern-matches red to failure and skips an item that actually just needs their input.
