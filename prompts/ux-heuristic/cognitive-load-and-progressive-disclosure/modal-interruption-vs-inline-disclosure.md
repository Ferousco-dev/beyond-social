---
id: cognitive-load-and-progressive-disclosure-modal-interruption-vs-inline-disclosure
title: Modal interruption versus inline disclosure
category: ux-heuristic
subcategory: progressive-disclosure
tags: [modal, progressive-disclosure, cognitive-load, interaction-pattern]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A modal forces full attention onto new information by blocking everything else;
an inline expansion adds information beside the task without blocking it. The
choice between them should track whether the disclosed content changes what the
user is about to do, not how much content there is.

The recipe:

- Reserve modals for information the user must resolve before continuing —
  confirming a destructive action, entering a required field the system just
  discovered it needs — where proceeding without reading would cause harm.
- Use inline disclosure (expand-in-place, side panel, popover) for anything
  optional or supplementary — extra detail, a preview, related options — that
  the user can take or leave without derailing the current task.
- Never modal a piece of content the user might want to reference while
  continuing to work — a shipping-cost breakdown they'd want visible while
  still editing quantities belongs inline, not in a dialog that vanishes on
  close.
- Keep every modal closable via Escape and a visible close control, and default
  focus to the modal's least destructive option, not its most severe one.
- If a modal's content routinely gets skimmed and dismissed without being read,
  that's a signal it wasn't actually blocking anything and should be inline.

Why: interruption is expensive — it discards the user's place in the surrounding
task and forces a context switch to resolve the modal before resuming. That
cost is worth paying only when the content genuinely must be resolved before
proceeding; spent on merely-supplementary information, it trains users to
reflexively dismiss modals without reading them, which defeats the mechanism
for the times it actually matters.

Example: deleting a project opens a confirm modal; viewing a project's word
count while editing shows it in an inline side panel that stays open.

Counter-example: a modal that pops up to show "Estimated render time: 45s"
every time a setting changes — informational, non-blocking content forced
through an interruption the user starts reflexively closing without reading.
