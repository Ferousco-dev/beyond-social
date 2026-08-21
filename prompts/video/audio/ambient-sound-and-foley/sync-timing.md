---
id: ambient-sound-and-foley-sync-timing
title: Foley must land on the exact frame of contact
category: audio
subcategory: foley
tags: [sync, timing, foley, precision]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Foley must land on the exact frame of the visible action it belongs to,
because even a few frames of drift reads as dubbed rather than live.

- Sync footstep sound to the frame the foot visibly contacts the ground.
- Sync an object-set-down sound to the frame of contact, not the start of
  the reach toward it.
- Sync door sounds, latch and hinge creak, to the door's visible motion,
  not offset before or after it.
- Order sound cues in a prompt in the same sequence as the visual action
  they belong to, so the model has an anchor to place them against.

Why: sync is a learned expectation built from a lifetime of embodied
cause-and-effect. A delay as small as three or four frames, under 150
milliseconds, is enough for the brain to flag "dub," because the natural
acoustic response to a visible contact event is near-instantaneous.

Example: "boot heel strikes the pavement, a hard tap sound exactly on
contact, not before or after the visible strike."

Counter-example: describing "footstep sounds throughout the walk" as a
vague background cue with no anchor to specific strike frames, which
leaves the model to place hits loosely out of sync with the visible gait.
