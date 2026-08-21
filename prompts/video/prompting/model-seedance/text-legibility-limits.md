---
id: model-seedance-text-legibility-limits
title: Working around Seedance's weak on-screen text rendering
category: video-prompting
subcategory: model-seedance
tags: [seedance, text-rendering, logos, limitations]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Like nearly every current video diffusion model, Seedance cannot reliably
render legible small text or a stable logo across frames, so the shot has to be
planned so text is never asked to survive the generation itself.

The recipe:

- Never ask the model to generate a shot whose payoff is reading on-screen
  text (a sign, a phone screen, a book page) — it will render plausible-looking
  but illegible or drifting glyphs.
- If a logo or wordmark must appear crisp, composite it in post onto a plate
  shot generated without it (a blank product surface, an empty storefront),
  rather than prompting the logo directly.
- Keep incidental background text (menus, posters) out of focus or at a
  distance — small in-frame and slightly soft reads as intentional production
  design, not a broken sign.
- If dialogue needs on-screen captions, add those as a separate text overlay
  in the edit, never inside the generation.

Why: the model's training weights text glyphs as texture rather than as
discrete symbolic characters, so it can approximate the general shape of
lettering but has no mechanism to keep every character consistent frame to
frame, which is why text warps or drifts even when everything else in the shot
holds steady.

Example: generate a clean, unbranded product shot on a turntable, then
composite the logo as a static overlay in post.

Counter-example: "A neon sign reading 'OPEN 24 HOURS' glowing above the diner
door" — the model produces sign-shaped glow with garbled or shifting letters
instead of the actual text.
