---
id: dashboard-layouts-live-video-job-status
title: Live status widgets for video generation queues
category: layout
subcategory: dashboard
tags: [video, dashboard, real-time, queue-status]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A widget tracking in-progress video renders needs a state model with more
granularity than "loading" or "done," because render jobs fail, retry, and
take minutes rather than milliseconds, and the user needs to know which
phase a job is actually in.

The recipe:

- Model at least four distinct states per job: queued, rendering (with an
  elapsed-time counter, not a percentage bar unless the underlying provider
  actually reports progress), complete, and failed-with-reason — never
  collapse "rendering" and "queued" into one generic "processing" state,
  since a stuck queue and an active render need different user reactions.
- Show elapsed time, not a fake progress percentage, when the provider gives
  no real progress signal; a progress bar that jumps from 10% to 100%
  because it was interpolated is more misleading than an honest "1m 42s
  elapsed."
- Poll or subscribe at an interval matched to the job's real duration (every
  3-5 seconds for a 30-second render, not every 500ms), and visually mark the
  moment new data lands (a brief highlight flash on the updated card) so the
  user can tell the widget is live rather than static.
- On failure, surface the actual failure reason in plain language next to a
  retry action inline on that job's row, not a generic "something went
  wrong" that sends the user to a support flow for a transient error.

Why: video generation is failure-prone and slow relative to typical SaaS
operations (seconds to minutes, with real failure rates from the underlying
model), so a status widget borrowed from a typical CRUD dashboard's binary
loading/done model hides exactly the information — which phase, how long,
why it failed — the user needs to decide whether to wait, retry, or escalate.

Example: a job row reading "Rendering — 0:47 elapsed" that transitions to
"Failed — provider timeout, retry available" with an inline retry button.
Counter-example: a spinning icon and the word "Processing" for every job
regardless of whether it's queued behind ten others or actively rendering,
giving the user no way to distinguish a healthy wait from a stuck one.
