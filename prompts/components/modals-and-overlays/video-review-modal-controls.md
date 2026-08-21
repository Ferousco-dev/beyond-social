---
id: modals-and-overlays-video-review-modal-controls
title: Playback controls for a video review modal
category: component
subcategory: modals-and-overlays
tags: [video-preview, modal, playback-controls, review]
applicability:
  platforms: [web]
  productTypes: [product-video, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A modal for reviewing a freshly generated video clip needs full scrub-and-compare controls, not just a play button, because the review task is spotting specific frames with artifacts, not passively watching the clip once.

- Include a frame-accurate scrubber, not just a coarse seek bar, so a reviewer can step frame by frame around a suspected morphing or artifact moment.
- Default to looping playback for a short clip under review instead of stopping at the last frame; reviewers re-watch a 6-second clip many times in a row.
- Keep the close, approve, and regenerate actions visible without covering the video frame, docking them below the player rather than floating them over the footage, since that hides exactly the region being judged.
- Support keyboard shortcuts for the review loop, such as space to play or pause, arrow keys to step frames, and a dedicated key for "regenerate," so a reviewer working through a batch doesn't have to mouse-target small controls each time.
- When comparing against a reference image or a prior generation, offer a side-by-side or toggle-overlay view inside the same modal rather than forcing the reviewer to open a second window.

Why: Reviewing generated video is a fault-finding task, closer to color-timing footage on a scope than to watching content for enjoyment. The controls need to support pausing on the exact frame where a hand fuses or a logo warps, not just confirm that the clip exists and plays.

Example: "Scrubber with per-frame stepping, loop toggle on by default, Approve and Regenerate buttons docked below the frame."
Counter-example: "A modal with only a native video tag and a big centered play button." A reviewer trying to pin down a five-frame artifact has no way to step precisely and ends up scrubbing blindly with a mouse.
