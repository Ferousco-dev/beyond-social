---
id: cognitive-load-and-progressive-disclosure-feature-gating-by-mastery
title: Gating power features behind demonstrated mastery
category: ux-heuristic
subcategory: progressive-disclosure
tags: [feature-gating, onboarding, cognitive-load, progressive-disclosure]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Power features shown to a brand-new user compete with the basics they haven't
mastered yet; earning the right to see a feature by first completing the
simpler workflow it extends keeps the interface matched to what the user
actually knows how to use.

The recipe:

- Pick a concrete unlock condition tied to real behavior, not tenure — "used
  the basic generator three times" beats "been a member for a week," because
  behavior indicates readiness and calendar time doesn't.
- Announce unlocks as a small, dismissible, positive notice ("Multi-shot
  editing is now available") rather than silently adding a new tab the user
  has to notice on their own.
- Keep the gated feature genuinely more complex, not artificially withheld —
  gating a simple feature to manufacture a sense of progression reads as
  friction, not pacing, the moment a user notices.
- Let advanced users skip the gate on request — a visible "show all features"
  toggle in settings respects the returning power user who doesn't need to
  re-earn what they already know.
- Log the unlock event so support and the user's own history can explain why a
  feature appeared, instead of it looking like an unexplained interface change.

Why: showing every capability on day one doesn't make the product more
powerful, it makes the first session slower, because a new user has to
mentally sort "features I need right now" from "features I might need
eventually" with no help. Gating by demonstrated behavior does that sorting
automatically and reveals complexity at the exact rate the user has shown they
can absorb it.

Example: a single-shot video generator that unlocks the multi-shot composer
after a user has published three single-shot videos, with a one-line notice.

Counter-example: gating the export-quality dropdown behind "7 days since
signup" — a trivial, non-complex control withheld for a reason unrelated to
whether the user is ready for it, which just reads as an arbitrary paywall.
