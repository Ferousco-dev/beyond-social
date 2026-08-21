---
id: model-veo3-dialogue-quotation-syntax
title: Quote dialogue exactly; direct delivery outside the quotes
category: video-prompting
tags: [dialogue, syntax, quotes, lip-sync]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Veo 3 reads text inside quotation marks as literal spoken dialogue to voice
and lip-sync, distinct from the prose describing the scene around it.
Malformed quoting is a leading cause of a character mouthing the wrong words,
narrating instead of speaking, or drifting out of sync.

Practice:

- Put only the exact words to be spoken inside straight quotation marks,
  attributed to a described speaker right before or after: "The barista says,
  'Oat milk or whole?'"
- Keep each quoted line short, one clause or a short sentence per shot. A
  long quoted paragraph gives the model more syllables than an 8-second clip
  can lip-sync cleanly, and sync degrades toward the end of the line.
- Write delivery (tone, pace, volume) as direction outside the quotes: "she
  asks flatly, 'You're kidding.'" Not folded inside the quoted text itself.
- Reserve quotes for audible spoken dialogue only. Don't quote sound effects
  or a character's internal thought, or the model may try to vocalize a
  description as if it were a line.

Why: quotation marks act as a strong structural signal that separates "text to
perform" from "scene to render," the same way a screenplay separates dialogue
from action lines. Conflating the two collapses that signal, and the model
either narrates the stage direction aloud or garbles lip movement trying to
sync text that was never meant to be spoken.

Example: "A tired line cook wipes his hands on his apron and says, 'Table six
is still waiting on the risotto.'"
Counter-example: "chef says table six waiting risotto tired annoyed voice."
No quotes and no clean literal line, so there's nothing precise to lip-sync.
