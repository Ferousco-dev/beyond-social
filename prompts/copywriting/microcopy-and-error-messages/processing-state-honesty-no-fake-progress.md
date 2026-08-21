---
id: microcopy-and-error-messages-processing-state-honesty
title: Progress copy during generation reflects real pipeline state, not a smoothed fake
category: copywriting
subcategory: microcopy-and-error-messages
tags: [loading-states, progress, honesty, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [short-form-video, product-video, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Users forgive a slow, honest wait far more readily than a dishonest one, so progress and ETA copy during a long AI generation job should reflect what's actually happening in the pipeline, not a smoothed animation or an invented countdown.

- Label stages by what's actually happening (parsing script, synthesizing voice, rendering frames, encoding) instead of one undifferentiated spinner.
- If a true ETA is unknown, give a range drawn from real historical data ("usually 1-3 minutes for this length") rather than counting down a fabricated number.
- Never let a progress bar sit at 99% for disproportionately long relative to the rest of its fill; jump or pace it to match real stage transitions.
- If a job is genuinely stalled, say so ("this is taking longer than usual") instead of continuing to animate as if nothing changed.
- Tie percentage or stage count to an actual pipeline step count, not to elapsed time alone.

Why: this exact moment is where the product is trying to demonstrate a result that should feel real rather than synthetic, and a progress indicator that lies — smooth early motion, then a long stall — teaches the user to distrust every future progress indicator in the product, which compounds well past this one wait.

Example: "Rendering frames (2 of 4 stages) — usually 45-90s for this length."

Counter-example: a bar that fills to 95% in three seconds, then sits frozen for two minutes before jumping to 100% — the fake early progress makes the real wait feel worse than an honest, evenly paced one would have.
