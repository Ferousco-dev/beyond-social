---
id: micro-interactions-focus-ring
title: Focus ring and keyboard affordance
category: motion
subcategory: accessibility
tags: [focus, keyboard, accessibility, affordance]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, auth, onboarding, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Keyboard focus needs its own visible state, separate from hover, and it must never
be removed without an equivalent replacement.

- Style with `:focus-visible`, not `:focus`, so the ring shows for keyboard and
  switch-device navigation but not for an ordinary mouse click, which would
  otherwise leave a ring sitting on the page after every click.
- Use a 2px solid outline with a 2-3px offset, in a color that holds at least
  3:1 contrast against both the control and the page background behind it
  (WCAG 2.4.11 non-text contrast), not a subtle 1px border tweak that's easy to
  miss.
- Make the ring appear with no animation delay, or at most a ~100ms fade; a
  keyboard user tabbing quickly through a form needs to see where focus landed on
  every single tab press, not after a leisurely transition catches up.
- Focus order must match the visual and DOM reading order. A ring that jumps to
  a visually distant element breaks the mental model of "next" a keyboard user
  is building as they tab through.
- Never write `outline: none` as part of a reset without immediately supplying a
  replacement focus style in the same rule set.

Why: `:focus-visible` exists because it distinguishes input modality: mouse users
don't need a ring on every click (they can see where they clicked), but keyboard
and assistive-technology users have no other way to know where they are on the
page. Treating focus as "the same as hover but blue" ignores that focus is often
the only feedback channel a keyboard-only or screen-reader user gets, which is why
removing it silently is a common but serious accessibility failure, not a cosmetic
choice.

Example: `a:focus-visible, button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }`

Counter-example: a global reset with `* { outline: none; }` and no follow-up rule.
The page looks cleaner in a mouse-driven screenshot but becomes unusable by keyboard,
since there is no longer any visible indication of where focus currently is.
