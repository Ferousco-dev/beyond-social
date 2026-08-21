---
id: micro-interactions-disabled-state-motion
title: Disabled-state motion cues
category: motion
subcategory: interaction-design
tags: [disabled-state, affordance, buttons, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, onboarding, e-commerce, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A disabled control should communicate its non-interactivity through the total
absence of hover and press motion, not through motion that then has to explain
itself with a tooltip.

- Strip every hover and active transition on disabled elements entirely: no
  transform, no shadow change, no color shift on cursor-over or press. Probing a
  disabled control with the cursor should produce exactly nothing.
- Set `cursor: not-allowed` and drop opacity to roughly 40-50%, low enough to
  read as inactive at a glance, but not so low the label becomes illegible or the
  control disappears from a quick scan of the surrounding UI.
- If the reason for disabling needs explaining ("complete step 1 first"), surface
  it through a tooltip triggered by hovering a wrapping element, since a genuinely
  disabled element often can't receive pointer events to trigger its own tooltip.
- When a disabled control becomes enabled, animate the transition with a modest
  150ms opacity and color fade only. A control becoming available isn't an event
  worth celebrating with a flourish; a quiet fade is enough to catch the eye
  without over-signaling.
- Never leave any residual hover styling from the enabled state's CSS bleeding
  through; disabled needs its own complete rule set, not the enabled rule set
  minus a click handler.

Why: motion on an interface element is implicitly a promise of interactivity. Any
hover lift, color shift, or press animation on a disabled control trains the user
to believe something happened, and when nothing follows, it reads as the app being
broken rather than the control being intentionally restricted. The complete
absence of response is, counterintuitively, the clearest possible signal that a
control isn't currently active, because it removes any ambiguity about whether the
input registered.

Example: `.button[disabled] { opacity: 0.45; cursor: not-allowed; transition: none; }`

Counter-example: a disabled button that still runs its normal hover-lift and
press-scale animations. Users click it two or three times assuming it's simply
slow to respond, when in fact it was never going to do anything.
