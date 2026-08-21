---
id: modals-and-overlays-modal-vs-inline-decision
title: When a modal beats inline editing
category: component
subcategory: modals-and-overlays
tags: [modal, inline, interruption, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A modal is the right call only when the task cannot be done safely or legibly without the user's full attention; everything that can stay in the page's own layout should stay there.

- Default to inline (contenteditable fields, row-level actions, disclosure panels) for anything the user is already looking at.
- Escalate to a modal when the action pulls in a different data model than the current view, such as creating a new customer while editing an invoice.
- Escalate to a modal when a mistake is expensive and irreversible, and the user needs a moment fully separated from the surrounding UI to confirm it.
- Escalate to a modal when the task has enough steps or fields that showing it inline would push the rest of the page's content off-screen or break its layout.
- Never use a modal just to make an action feel more important; weight should come from typography and placement, not from blocking the screen.

Why: A modal suspends the page's scroll position, hides peripheral context, and forces a decision before the user can return to what they were doing. That interruption cost is only worth paying when the alternative, acting with incomplete context or fumbling a change that's hard to undo, is worse than the interruption itself. Reaching for a modal by default trains users to treat every action as a mode switch, which slows the whole product down.

Example: "Rename the column inline: double-click the header, contenteditable span, commit on blur or Enter."
Counter-example: "Open a modal with a single text field to rename a table column." The task is a one-field edit the user can already see; wrapping it in a modal adds two extra clicks and a full-screen dim for something that needed neither.
