---
id: empty-loading-error-states-indeterminate-generation-progress
title: Long AI generation jobs need staged progress, not a spinner
category: product-pattern
subcategory: empty-loading-error-states
tags: [loading-state, video-generation, progress, saas-dashboard]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, short-form-video, talking-avatar, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A video generation job runs 20 seconds to several minutes with no reliable
percentage-complete signal, so a bare spinner or fake progress bar reads as
frozen well before the job actually finishes; the fix is staged, named
progress instead of a continuous fraction.

- Break the job into its real backend stages (queued, rendering frames,
  compositing audio, encoding, ready) and advance a stepped indicator through
  named labels as each stage's webhook/poll confirms completion.
- Never fabricate a smooth percentage that isn't backed by a real signal; a bar
  that reaches 90% in ten seconds then sits there for two minutes teaches
  users the number is fiction and they stop trusting it.
- Show elapsed time, not estimated remaining time, unless remaining time is
  computed from actual historical percentiles for that job type, "Usually
  takes 40 to 90s" beats a made-up countdown that misses.
- Let the user navigate away and get notified on completion (toast, badge,
  email) rather than trapping them on a blocking wait screen for a
  multi-minute job.
- On queue congestion, say so explicitly, "3 jobs ahead of you," instead of
  letting the stage indicator sit motionless with no explanation.

Why: generation jobs are exactly the case where users most need to trust the
system is working, because the wait is long enough that anxiety compounds,
and a bar that's clearly disconnected from ground truth removes the one
signal that was supposed to reduce that anxiety. Staged labels tied to real
backend events keep the perceived wait honest even when the actual duration
is unpredictable.

Example: "Rendering shot 2 of 3…" advances to "Compositing audio…" only when
the render-complete webhook fires, each stage a real, verifiable event.
Counter-example: a progress bar that animates smoothly from 0 to 95% over 15
seconds regardless of actual job state, then hangs indefinitely waiting for
the real completion webhook.
