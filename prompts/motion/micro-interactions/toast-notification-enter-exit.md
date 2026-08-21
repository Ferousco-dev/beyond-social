---
id: micro-interactions-toast-transition
title: Toast notification enter and exit motion
category: motion
subcategory: interaction-design
tags: [toast, notification, timing, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A toast needs entrance and exit motion that never competes for attention with the
content it's commenting on, and dismiss timing that respects how long the message
actually takes to read.

- Enter: slide in 200-250ms ease-out from the edge nearest its stacking origin
  (typically bottom-right on desktop, bottom-center on mobile), combined with a
  simultaneous fade, not a sequential slide-then-fade.
- Exit: fade plus a short continued slide in the same direction it entered from,
  150-200ms ease-in, always faster than the entrance since dismissal shouldn't
  linger and steal a second beat of attention.
- Scale auto-dismiss duration to message length rather than a flat timer: roughly
  1 second base plus ~50ms per word, with a 3-second floor so even short
  confirmations stay legible.
- Pause the dismiss countdown while the toast has hover or keyboard focus, and
  resume it once that focus leaves.
- When stacking multiple toasts, shift existing ones to make room with an 8-12px
  gap rather than overlapping them or letting a new one cover an older one.

Why: a toast is a passive, low-stakes confirmation, so entrance motion with a
bounce or overshoot draws more visual attention than the message deserves and
competes with whatever the user was already doing. Tying auto-dismiss timing to
word count instead of a flat 3-second default matters concretely: a one-word
"Saved" and a two-sentence error message read at very different speeds, and a flat
timer either lingers too long for the short one or clips the long one before it's
been read.

Example: `"Saved" -> ~1.1s dismiss; "Couldn't save changes, check your connection and try again" -> ~1s + 8 words * 50ms ≈ 3.4s dismiss.`

Counter-example: every toast, regardless of message length, auto-dismisses at a
fixed 3 seconds with no pause-on-hover. A longer error message disappears mid-read
the moment the user reaches for it with the cursor.
