---
id: model-veo3-lip-sync-accuracy
title: Lip-sync fidelity is a framing problem, not a wording problem
category: video-prompting
tags: [lip-sync, dialogue, framing, talking-avatar]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Getting mouth movement to match the audio precisely is a separate problem from
voice quality or dialogue wording. It's driven mostly by camera angle, line
length, and how much else is moving in the shot, not by asking for "accurate
lip sync" in the prompt.

Practice:

- Favor front-facing or three-quarter angles on the speaking character.
  Profile shots and mouths partly occluded by a hand, hair, or a mic reduce
  visible sync fidelity because there's less mouth geometry to animate.
- Keep quoted lines short, roughly under 12-15 words. Sync quality holds up
  better across a short line than one crammed into a single 8-second clip.
- Avoid large head or camera movement during a spoken line. Movement competes
  with mouth-shape animation for the same motion budget, and sync usually
  degrades first.
- For a close-up talking shot, frame tight enough that the mouth is a
  meaningful fraction of the image. Sync errors are far more visible, and far
  more common, in a wide shot where the face is small.

Why: lip sync is a byproduct of how much of the model's attention is spent
animating the mouth versus everything else moving in frame. Reducing
competing motion and giving the mouth more pixels is a framing and blocking
fix, the same way a real ADR session syncs more reliably in close-up than in
a wide two-shot with the actor turned away.

Example: "Close-up, front-facing, on a woman at a kitchen counter, camera
locked off, she says, 'Dinner's almost ready.'"
Counter-example: "wide shot, she paces around the kitchen turned away from
camera delivering a full three-sentence speech." Too little mouth visible,
too much competing movement, line too long.
