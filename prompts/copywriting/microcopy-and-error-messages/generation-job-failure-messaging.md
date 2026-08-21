---
id: microcopy-and-error-messages-generation-job-failure
title: Generation failures name the pipeline stage and the credit status
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, video-generation, credits, retry]
applicability:
  platforms: [web, mobile]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

An AI video generation failure has already cost the user time and possibly a credit before the error even appears, so the message has to answer two questions immediately: did I lose anything, and is retrying worth it.

- Name the pipeline stage that failed (script parsing, voice synthesis, frame rendering, encoding), not just "generation."
- State explicitly whether the credit or generation was charged or automatically refunded.
- Offer a direct retry button that resubmits the same prompt and assets without making the user re-enter anything.
- If the failure is model-side rather than caused by the user's prompt, say so plainly so they don't waste time editing a prompt that wasn't the problem.
- If the same input is likely to fail again (an unsupported aspect ratio, a banned term), say what specifically needs to change before retrying.

Why: unlike a form validation error, a generation failure sits downstream of real cost — wall-clock time and often metered credits — so the two facts a user needs before they'll try again are whether they're being charged twice for one attempt and whether changing anything on their end would actually help.

Example: "Rendering failed during voice sync. Your credit was not charged. Retry with the same script?" [Retry]

Counter-example: "Generation failed." with no mention of credit status forces the user to check billing separately before they can even decide whether retrying is worth the risk.
