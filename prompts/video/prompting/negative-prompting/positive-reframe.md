---
id: negative-prompting-positive-reframe
title: Convert exclusions into the positive instruction that prevents them
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, positive-framing, phrasing, craft]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Most video models weight what a prompt describes far more heavily than what a
negative field forbids, because the negative channel is a weaker, separate
signal, not part of the scene description the model is rendering toward.
The highest-leverage move is often to delete the negative term and instead
write the positive condition that makes the failure impossible.

The recipe:

- "No fast cuts" becomes, in the main prompt, "single continuous shot, no cut."
- "Not shaky" becomes "camera on a locked tripod" or "slow, controlled dolly."
- "No extra fingers" becomes framing the hand doing one simple, named action,
  or keeping the hand out of frame entirely.
- Reserve the negative-prompt field for genuine leftovers: things the positive
  prompt cannot fully rule out on its own, like text artifacts or watermarks.

Why: a negative prompt subtracts from a probability distribution the model has
already committed to based on the positive description. If the positive prompt
describes a busy crowd scene, "no extra limbs" is fighting the very
composition the prompt just requested. Removing the cause upstream is more
reliable than suppressing its symptom downstream.

Example: positive prompt "static tripod shot, single presenter, hands resting
on desk," negative prompt reduced to just "no watermark, no subtitles burned
in."
Counter-example: positive prompt describing "energetic hand gestures while
talking," paired with negative prompt "no extra fingers, no warped hands." The
two instructions pull against each other and the hands stay the least reliable
part of the shot.
