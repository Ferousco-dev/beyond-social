---
id: negative-prompting-text-logo-integrity
title: Excluding garbled on-screen text and drifting logos
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, text, logo, brand]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Any legible text or brand mark in a generated shot is a high-risk region:
models render letterforms as approximate shapes rather than encoded
characters, so text drifts into illegible glyphs and logos redraw themselves
slightly frame to frame. The fix is not a single exclusion but a combination
of what to exclude and what to keep out of frame in the first place.

What to exclude and how to scope the shot around it:

- Exclude "illegible text, garbled letters, warped logo, shifting brand mark"
  as literal terms in every shot that includes any readable text or logo.
- Where the brand mark's exact shape matters, pin it explicitly in the
  positive prompt: "logo shape and proportions held exact, no redraw," since
  the negative term alone will not anchor geometry the model has no reference
  for holding steady.
- Exclude "new invented text appearing on blank surfaces," a common failure
  where a model fills empty labels, screens, or signage with fabricated,
  nonsense characters unprompted.
- Where the actual text does not matter to the shot, the more reliable move
  is to keep it out of frame or heavily defocused rather than to negative-
  prompt against its failure; unreadable-by-design defocus fails safe, an
  attempted crisp render does not.

Why: character-level fidelity is not something these models were trained to
guarantee, so text and logos are the one category where negative prompting
alone under-performs; framing the shot to reduce exposure to the risk does
more than any exclusion phrase can.

Example: "product label kept soft-focus in background, logo shape pinned
exact in the one sharp insert shot; exclude: illegible text, invented text on
blank packaging."
Counter-example: a crisp, static hero shot lingering on a full paragraph of
fine-print label text with only "no garbled text" in the negative prompt.
