---
id: microcopy-and-error-messages-upload-rejection-specificity
title: Upload rejections state the actual number against the actual limit
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, uploads, file-validation, specificity]
applicability:
  platforms: [web, mobile]
  productTypes: [product-video, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A file upload fails against a hard technical boundary the user usually can't see on their own — codec, bitrate, resolution, duration — so the rejection message is the only source of truth they have to fix it, and it needs real numbers, not a category label.

- State the file's actual property next to the limit: "this file is 340MB, the limit is 200MB," not "file too large."
- Name accepted formats explicitly (MP4, MOV, up to 1080p) rather than saying "unsupported file type."
- If the fix is automatable — server-side compression, format conversion — offer that instead of only rejecting the file.
- Keep the rejected file's name visible in the message so a multi-file upload leaves no ambiguity about which one failed.
- Separate distinct failure reasons (size vs. duration vs. codec) into their own lines rather than one merged "upload failed."

Why: users can't inspect a file's bitrate or container format themselves, so a message that omits the actual numbers turns what should be a five-second fix — trim ten seconds, or re-export at a lower bitrate — into a guessing game of trial-and-error re-uploads.

Example: "product-demo.mov is 340MB; the limit is 200MB. Trim the clip or export at a lower bitrate."

Counter-example: "File upload failed." given for one of three files uploaded together, with no name and no reason — the user can't tell which file to fix or what was wrong with it.
