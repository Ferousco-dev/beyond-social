---
id: navigation-patterns-top-nav-marketing-sites
title: Top nav structure for marketing sites vs app shells
category: component
subcategory: navigation
tags: [navigation, top-nav, marketing-site, landing-page]
applicability:
  platforms: [web]
  productTypes: [marketing-site, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A marketing site's top nav sells the next click; an app shell's top nav orients
a returning user inside a tool. Conflating the two produces a marketing site
that reads like a dashboard, or a product that nags visitors to "Learn More."

- Marketing top nav: 4-6 links max (Product, Pricing, Customers/Docs, Company),
  one clearly styled primary CTA button on the right (Sign up / Book a demo),
  logo links home.
- App shell top nav (when used instead of a sidebar): account/workspace switcher
  on the left near the logo, search or command trigger in the center or left,
  utility icons (notifications, settings, avatar menu) on the right — no
  marketing links.
- Never put a pricing or "Get Started" CTA inside an authenticated app's top
  nav; the audience already converted.
- Sticky-on-scroll is appropriate for marketing top nav (keeps the CTA
  reachable during a long scroll) but should shrink in height once scrolled, so
  it doesn't eat viewport on mobile.
- Marketing nav should collapse to a hamburger only below ~768px; app-shell top
  nav utility icons should never collapse behind a hamburger — they're
  frequent-use, not discovery-use.

Why: the marketing nav's job is conversion funnel guidance for a first-time,
skeptical visitor; the app nav's job is fast orientation for someone who
already trusts the product and returns daily. Optimizing one for the other's
goal actively hurts the metric that matters in that context.

Example: "marketing top nav: logo, Product, Pricing, Docs, [Sign in], [Start
free trial] button."

Counter-example: an authenticated dashboard's top bar carrying a "Book a Demo"
button next to the user's avatar — dead weight for someone already paying.
