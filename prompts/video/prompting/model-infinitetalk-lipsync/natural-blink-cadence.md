---
id: model-infinitetalk-lipsync-natural-blink-cadence
title: Blink rate and rhythm as an uncanny-valley signal
category: video-prompting
subcategory: eye-movement
tags: [infinitetalk, blink, eyes, uncanny-valley]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Humans blink roughly 15-20 times a minute at rest, faster under stress or
bright light, and blinks cluster around speech: people tend to blink at the
start or end of a phrase, not mid-word. An avatar that never blinks, or blinks
on a metronome, reads as synthetic within seconds.

- Prompt for "occasional natural blinking, slightly irregular timing" rather
  than leaving blink behavior unspecified, since the model's default under
  some seeds is a near-frozen open-eye stare.
- Avoid asking for a specific blink count or a fixed interval; regularity is
  what breaks the illusion, not the blink itself.
- For scripts with clear phrase boundaries, note that blinks landing near a
  clause break will look more motivated than blinks landing mid-word.
- If the model over-blinks (fluttering, more than one blink per second),
  that reads as anxious or glitchy; dial the description back to "relaxed,
  infrequent blinking" rather than removing blink language entirely.

Why: blink timing is one of the cheapest signals a viewer's visual system uses
to judge whether a face is alive, because it is involuntary and irregular in
real people; both a zero-blink stare and a perfectly periodic blink pattern are
patterns a machine would produce, so either one snaps the illusion.

Example: "natural, slightly irregular blinking, roughly every few seconds,
relaxed rather than wide-eyed."

Counter-example: a reference and prompt combination that yields a fixed,
metronomic blink every exact 3 seconds, technically "blinking" but visibly
mechanical the moment you time it against a real interview clip.
