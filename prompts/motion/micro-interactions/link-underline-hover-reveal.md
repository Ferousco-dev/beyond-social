---
id: micro-interactions-link-underline-reveal
title: Link underline hover reveal
category: motion
subcategory: interaction-design
tags: [links, hover, underline, navigation]
applicability:
  platforms: [web]
  productTypes: [marketing-site, landing-page, portfolio, blog]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

An underline that grows from one side on hover reads as more deliberate than one
that simply fades in, and it costs nothing extra in layout performance if built
correctly.

- Build it as a pseudo-element with `transform: scaleX(0)` at rest, animating to
  `scaleX(1)` on hover, `transform-origin: left` (or `center` if the emphasis
  should feel symmetric rather than directional).
- Duration 200-250ms, ease-out. Reverse the animation from the same origin it
  grew from on hover-out; switching the origin between in and out reads as
  glitchy rather than as one continuous gesture.
- Set the underline 1-2px thick, offset 2-4px below the baseline, clear of
  descenders (g, y, p) so it doesn't collide with the letterforms themselves.
- Reserve this treatment for navigation links and CTA-style text links where the
  clickability needs reinforcing; body-copy links should rely on color and weight
  alone; adding animated underlines to every inline link in a paragraph turns
  normal reading into a field of moving lines.
- Animate with `transform`, not `width`. A width-based underline changes layout
  geometry every frame, which forces the browser to repaint; a transform-based one
  is compositor-only.

Why: a growing underline mimics the physical motion of a pen underlining text,
giving it directional intent that a plain fade-in lacks, since a fade communicates
only "appeared" with no sense of motion or cause. The transform-versus-width
distinction isn't just a performance nicety either: on a lower-end device or a
page with many links, animating `width` on several links at once can visibly
stutter, while the transform version stays smooth regardless of how many links
are animating.

Example: `.nav-link::after { transform: scaleX(0); transform-origin: left; transition: transform 220ms ease-out; }`

Counter-example: an underline built with `width: 0` animating to `width: 100%` on
hover. Each frame forces a layout recalculation, and on a page with a dozen nav
links hovered in quick succession the animation visibly stutters instead of gliding.
