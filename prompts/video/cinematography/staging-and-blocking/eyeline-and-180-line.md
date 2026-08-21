---
id: staging-and-blocking-eyeline-180-line
title: Locking the 180-degree line so eyelines stay consistent across generations
category: cinematography
subcategory: staging-and-blocking
tags: [eyeline, continuity, blocking, two-shot]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Two subjects (or a subject and a product they address) establish an imaginary
axis between them; the camera must stay on one side of that axis across every
shot in the sequence, or the two will appear to have swapped places when cut
together.

- Before writing any multi-shot sequence, decide which subject is
  screen-left and which is screen-right, and state it explicitly in every
  shot's prompt, since each generation has no memory of the others.
- If subject A looks camera-right at subject B, subject B must look
  camera-left back at subject A in the reverse shot, never the same direction.
- For a person addressing a product, keep the product on the same side of frame
  across cuts unless a hand physically moves it on-screen.
- Do not cross the line for a "more dynamic" reverse angle unless the camera
  move that crosses it is shown on-screen (a pan or dolly the viewer can follow).
- Do not let a wide shot and its matching close-up disagree on which side each
  subject occupies; re-state screen position in both prompts.

Why: continuity editing works because the viewer builds a mental map of the
scene's geography from the first shot and expects every later shot to respect
it. Because each AI generation is produced independently with no shared memory
of prior shots, screen direction has to be pinned explicitly in text every time,
or the model will default to whatever framing looks best in isolation and break
the axis without knowing it did.

Example: "Shot 1: presenter screen-left facing right, product screen-right.
Shot 2 (reverse): camera on the same side of the axis, presenter still
screen-left, product still screen-right, presenter's gaze still directed right."
Counter-example: writing shot two as "presenter now on the right side of frame"
for variety — the product appears to have jumped sides between cuts.
