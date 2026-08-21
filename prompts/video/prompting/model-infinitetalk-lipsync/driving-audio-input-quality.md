---
id: model-infinitetalk-lipsync-driving-audio-input-quality
title: Clean driving audio is the ceiling on lip-sync quality
category: video-prompting
subcategory: audio-input
tags: [infinitetalk, audio, lipsync, driving-audio]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

InfiniteTalk maps mouth shapes to the waveform it is given, so any defect in the
driving audio becomes a defect in the mouth. The model cannot separate a speaker
from room noise, so it syncs to whatever amplitude and formant peaks are present,
noise included.

- Isolate the voice: strip reverb tails, HVAC hum, and music beds before feeding
  the track in; a de-noiser or a vocal-isolation pass first is worth it.
- Keep loudness consistent (avoid clipping and avoid near-silent whispers) so
  viseme intensity doesn't flatten out or spike unnaturally.
- Use a single speaker per clip; overlapping voices make the model average two
  sets of mouth shapes into a smeared, generic "talking" motion.
- Match sample rate and mono/stereo format to what the model expects rather
  than letting an upload pipeline auto-convert and introduce artifacts.
- Trim dead air at the head and tail of the file so the avatar isn't animated
  by silence before the first word.

Why: the model's lip-sync network reads amplitude envelopes and spectral
transitions as its timing signal. Noise, bleed, or a second voice pollutes that
signal, and the model still produces motion for it, which shows up as mouth
shapes that don't correspond to any actual phoneme, the classic tell of a
synced-looking-but-wrong avatar.

Example: "voice track, single speaker, noise-reduced, normalized to -16 LUFS,
mono, 200ms of silence trimmed from head and tail."

Counter-example: dropping in a phone-recorded voice memo with background chatter
and music underneath, then expecting crisp lip-sync, the model will animate the
chatter and music transients along with the speech.
