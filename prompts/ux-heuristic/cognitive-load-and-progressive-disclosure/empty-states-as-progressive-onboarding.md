---
id: cognitive-load-and-progressive-disclosure-empty-states-as-progressive-onboarding
title: Empty states as progressive onboarding
category: ux-heuristic
subcategory: progressive-disclosure
tags: [empty-state, onboarding, progressive-disclosure, cognitive-load]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

An empty state is the one moment a feature area has the user's full attention
with nothing competing for it, which makes it the right place to teach that
feature — not with a generic "no items yet" message, but with the specific
next action that fills the space.

The recipe:

- Replace "No items found" with the single most common first action, phrased
  as an instruction: "Generate your first video" beats "You have no videos."
- Show exactly one primary call to action per empty state, not a menu of every
  possible thing the user could do here — that belongs in the populated view's
  toolbar, once there's content to act on.
- Use the empty state's illustration or copy to hint at the *kind* of content
  that will appear there, so the first real item doesn't feel like a surprise
  or an error.
- Retire the teaching copy the moment real content exists — an empty-state
  explanation that persists as a tooltip after the first item is created stops
  being helpful and starts being clutter.
- Never explain a feature the user hasn't reached yet inside an unrelated empty
  state; teach the feature that lives on this screen, not a preview of one two
  screens away.

Why: onboarding tours and walkthroughs compete with the task the user actually
came to do and get dismissed unread. An empty state has no such competition —
there's nothing else on screen — so the explanation lands exactly when the
user needs it and nowhere else, which is progressive disclosure timed to
screen state rather than to a fixed tour sequence.

Example: an empty projects dashboard reads "Nothing here yet — generate your
first video to see it appear in this list" above a single Generate button.

Counter-example: a generic gray "No data" placeholder with no action and no
explanation, forcing the user to hunt the rest of the interface for what to do.
