---
id: rig-moves-dolly-crane-gimbal-camera-move-settle-and-landing
title: Give every camera move an explicit landing frame
category: camera-movement
tags: [landing, settle, composition, ending]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Every rig move needs a stated frame where the camera comes to rest, or
deliberately doesn't, before the cut. A move still traveling when the shot
ends reads as unfinished, or worse, as an endless drift with no destination.

- Describe the last quarter- to half-second of the move as a deceleration
  into a specific, nameable composition, "settles into a medium close-up,
  her face just left of center," rather than leaving the end state implicit.
- Treat a hard stop, a crash zoom or a snap whip pan, as a deliberate
  exception: state it as a stop, not a settle, so the model doesn't soften
  it into a gentle ease by default.
- Give the landing frame a reason to be a frame: rule-of-thirds placement, a
  clean edge to cut on, headroom that matches the next shot, since this is
  often the frame an editor holds on or cuts out of.
- Never end a prompt on the verb alone ("pushes in on her") without stating
  where it stops.

Why: a beginning and a middle without a defined end leaves the generative
model to guess where the camera should stop, and its default guess is often
to keep drifting or freeze awkwardly mid-motion, both avoidable by simply
specifying the landing.

Example: "dolly push-in decelerating over the final second, settling into a
static close-up with her eyes on the upper third and the doorway soft
behind her."

Counter-example: "camera pushes in on her" with no end state specified —
leaves the shot's final composition, and whether the move even finishes,
entirely up to chance.
