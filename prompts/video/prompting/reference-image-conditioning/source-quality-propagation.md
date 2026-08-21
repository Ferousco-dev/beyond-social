---
id: reference-image-conditioning-source-quality-propagation
title: Source image flaws propagate directly into the generated video
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, source-quality, compression-artifacts, upscaling]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Every flaw in the reference image — compression blocking, upscale halos,
chromatic noise — gets treated by the model as real texture to preserve and
animate, so a slightly degraded source produces a visibly degraded,
artifact-riddled video even with a clean prompt.

- Start from the highest-resolution, least-compressed version of an image
  available; re-exporting a JPEG that's already been saved and resized twice
  compounds the artifacts.
- Check for upscaler halos (unnaturally crisp edges next to soft, waxy skin or
  surface texture) before using an image; models will animate that wax-and-halo
  look as if it's the intended skin texture.
- Avoid screenshots of images (a screenshot of a screenshot, or a photo of a
  screen) as references; moire and scan-line patterns get read as fine detail
  and can flicker or crawl once in motion.
- When only a low-quality source exists, favor a tighter crop on the cleanest
  region over feeding the whole degraded frame.

Why: reference-conditioned video generation treats the input pixels as ground
truth to be extended in time; it has no way to distinguish "this blockiness is a
JPEG artifact" from "this blockiness is a real textured surface," so it
preserves and often amplifies compression noise as the video adds motion and
lighting change on top of it.

Example: sourcing the original camera export or a lossless frame grab rather
than a resized web thumbnail for the reference.

Counter-example: pulling a reference from a social post that's already been
compressed, cropped, and re-uploaded twice; the video inherits every generation
of artifact and often develops a faint crawling noise pattern once motion is
added.
