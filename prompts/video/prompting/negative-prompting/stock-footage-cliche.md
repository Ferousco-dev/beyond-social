---
id: negative-prompting-stock-footage-cliche
title: Excluding generic stock-footage camera tropes
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, stock-footage, cliche, cinematography]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Because stock and corporate footage make up a large share of training video,
unprompted generations default to that genre's specific visual grammar: a
slow drone reveal opening a scene, a lens flare sweeping across frame,
diverse actors laughing at a laptop that shows nothing on screen. These are
recognizable clichés, and recognizability is exactly why they read as
generic rather than as a real, specific shoot.

What to exclude, named as the actual trope:

- Exclude "drone establishing shot rising over the scene, sweeping lens
  flare across frame, actors laughing at an off-screen laptop" as literal
  terms when the goal is a shot that reads as specific rather than stock.
- Exclude "generic corporate high-five, fist bump, or handshake in soft
  focus," a stand-in gesture stock footage uses to signify "teamwork"
  without depicting an actual task.
- Exclude "rack focus from foreground object to smiling face in background,"
  a stock transition used so often it now reads as a genre marker on its own.
- Replace each excluded trope with an actual, specific action tied to the
  brief: not "team celebrating," but "one person closing a laptop and
  exhaling, no one else in frame."

Why: a cliché is a shot the viewer has seen so many times it stopped reading
as observed and started reading as a category label; naming the specific
trope in the negative prompt does more than a generic "not stock footage
looking" because the model has a strong, learned association for these exact
compositions and needs a matching, specific instruction to move away from them.

Example: "single person at a workbench, hands on the actual object being
worked on, no reaction shot to camera; exclude: drone reveal, lens flare
sweep, generic laptop laughing shot."
Counter-example: "professional, polished marketing footage" with no named
trope excluded, which is exactly vague enough to default straight into the
drone-reveal-and-lens-flare package.
