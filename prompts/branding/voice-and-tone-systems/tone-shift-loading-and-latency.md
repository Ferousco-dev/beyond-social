---
id: voice-and-tone-systems-tone-shift-loading-and-latency
title: Tone rules for waiting, loading, and generation-in-progress states
category: branding
subcategory: voice-and-tone
tags: [tone, loading-states, latency, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, short-form-video, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Waiting copy has a narrow, specific job — manage the user's expectation of
time — and tone that ignores this in favor of personality makes the wait
feel longer, not shorter.

- Prefer concrete progress language over vague reassurance: "rendering shot 3
  of 5" beats "hang tight, magic is happening" — specificity reads as the
  system knowing what it's doing, which is itself calming.
- Scale tone to expected duration: under 3 seconds needs no copy at all;
  5–30 seconds can carry one line of neutral status; anything longer
  (video generation, batch renders) earns a slightly warmer, patience-framed
  line, since the user has time to actually read it.
- Never promise a time estimate the system can't reliably hit — a countdown
  that's wrong erodes trust faster than no countdown at all.
- Avoid whimsical loading messages ("brewing your coffee," "polishing
  pixels") in professional contexts — they read as filler once seen more
  than once, and generation is a moment users take seriously with paid
  credits on the line.
- If the wait is long enough to risk abandonment, tell the user what they can
  do meanwhile ("you can navigate away, we'll notify you") rather than just
  asking for patience.

Why: perceived wait time is driven more by whether the user trusts the
system is progressing than by the actual clock — vague, personality-forward
copy reads as filler precisely because it gives no evidence of progress,
while plain status language functions as proof of work even without a
progress bar.

Example: "Rendering shot 2 of 4 — usually 30–60s per shot. Feel free to
leave this tab, we'll notify you when it's ready."

Counter-example: repeating "Hang tight, good things take time! ✨" with no
status change for two minutes — a user watching that message loop starts
to suspect the system is stuck, not patient.
