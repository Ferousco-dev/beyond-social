---
id: modals-and-overlays-generation-progress-overlay
title: Progress overlays during AI video generation
category: component
subcategory: modals-and-overlays
tags: [progress-overlay, loading-state, ai-generation, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, product-video, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A blocking overlay during AI video generation must show real, monotonic progress with a specific stage label, because an indeterminate spinner over a multi-minute wait reads as a stalled or crashed app, not a working one.

- Break the job into named stages the user can recognize, such as "Analyzing script," "Rendering frames," "Compositing audio," and update the label as each completes, even if the underlying percentage is an estimate.
- Never let a progress bar move backward or reset to 0% on a stage change; recompute the overall percentage so it stays monotonic across stages, even when per-stage estimates are rough.
- Let the user navigate away or minimize the overlay to a persistent status chip, rather than trapping them in a blocking modal for a 2-3 minute job, and notify them when it finishes.
- Show an estimated time remaining once there's enough signal to estimate it, and avoid false precision, such as a countdown to the second, if actual variance is high; a rounded range reads as more honest.
- On failure, replace the overlay with a specific error and a retry action scoped to the failed stage, not a generic "Something went wrong, start over."

Why: Generation jobs are long enough that a plain spinner crosses from reassuring to "is this frozen" within seconds. Staged, monotonic progress gives the user evidence the system is actually working, and letting them step away respects that a multi-minute wait shouldn't require a blocking, undismissable modal.

Example: "Stage 2 of 4, Rendering frames, 34%, estimated 1-2 minutes remaining. [Notify me when done]"
Counter-example: "An indeterminate spinner with only the word 'Generating...' for a 3-minute job, trapped in a modal with no way to leave." Users assume it's stuck well before the job actually finishes and either reload the page or abandon it.
