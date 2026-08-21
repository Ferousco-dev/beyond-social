---
id: model-veo3-diegetic-sound-sync
title: Bind a sound to its visible cause in the same phrase
category: video-prompting
tags: [foley, sound-sync, audio, diegetic]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Because Veo 3 generates audio and video jointly, a sound effect lands in sync
with the action that causes it most reliably when the cause and the sound are
described together in one phrase, not listed separately as disconnected
ambience.

Practice:

- Pair the visible cause and its sound in one clause: "her boots crunch on
  gravel with each step," not "footsteps" listed as a generic ambience item
  elsewhere in the prompt.
- Limit synced foley to the one or two actions actually visible and central
  to the shot: a hand setting down a glass, a door latching shut. Syncing
  sound to something off-frame or incidental rarely lands cleanly.
- For one decisive sound moment (a slap, a dropped object, a door slam),
  describe it at the exact beat it happens in the action, not front-loaded
  before the action is introduced.
- Layer a broader ambience bed separately from the synced foley event, so the
  model has both a constant background layer and one distinct, timed event to
  hit.

Why: joint audio-video generation is strongest when a sound event and its
visual trigger are described as one bound unit, because that mirrors how the
training footage actually paired sound to action: a boom mic recording synced
to the camera. An unbound list of ambient nouns gives the model nothing to
anchor timing to, so the sound drifts loose from the visible motion.

Example: "He sets the ceramic mug down on the wooden table with a soft clink,
then wraps both hands around it."
Counter-example: listing "kitchen ambience, mug sounds, table sounds" as a
separate tag block disconnected from the actual described action.
