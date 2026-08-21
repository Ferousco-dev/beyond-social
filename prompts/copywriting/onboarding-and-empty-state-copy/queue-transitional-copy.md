---
id: onboarding-and-empty-state-copy-queue-transitional
title: A generation-in-progress state sets a time expectation, not a spinner and silence
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [loading-state, queue, expectation-setting, microcopy]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

While a video is rendering, the empty result slot is doing real work: it
should tell the user roughly how long the wait is and what's happening,
because unexplained waits feel far longer than labeled waits of the same
length.

- Give a concrete estimate drawn from real data, "usually ready in 45-90
  seconds," never "this may take a moment."
- Update the label as stages actually change, "rendering shot 2 of 3," only if
  the pipeline has real stages. Do not fabricate stages that don't correspond
  to real backend steps.
- Let the user leave the screen and return without losing the job, and say so
  explicitly: "We'll notify you, feel free to close this tab."
- Never reuse true-empty-state copy during a known-pending job. A queued job
  showing "No videos yet" underneath the spinner contradicts itself.
- If the queue is backed up beyond the normal estimate, say so with a real
  number, "high demand, this one's taking longer, about 3 minutes," rather
  than staying silent past the promised time.

Why: waiting-time research consistently shows labeled, explained waits are
tolerated far better than equal-length unexplained ones. A bare spinner with
no text asks the user to supply their own story for the delay, and the
default story is worry about whether the product is broken.

Example: "Rendering your video, usually ready in under a minute. We'll notify
you when it's done."
Counter-example: a bare spinner with no text, sitting over an empty grid, for
a process that regularly takes over a minute.
