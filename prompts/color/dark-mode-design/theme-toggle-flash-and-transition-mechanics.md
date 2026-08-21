---
id: dark-mode-design-theme-toggle-transition
title: Prevent flash-of-wrong-theme and jarring transitions on theme switch
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, theme-toggle, fouc, transition]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A theme system that determines dark/light after the first paint produces a
visible flash of the wrong theme (FOUC) on load, and a theme system that
animates every color property on toggle produces a distracting, uneven
transition where text, borders, and backgrounds each seem to fade at
different rates.

- Read the theme preference (stored choice, or `prefers-color-scheme`) and
  set it as an attribute on the root element in a blocking inline script
  before the stylesheet paints, so the correct theme is present on first
  frame, not applied after a flash of the default.
- Respect `prefers-color-scheme` as the default for users who haven't made an
  explicit in-app choice, and persist an explicit choice separately so it
  survives a system-level theme change mid-session.
- If animating the toggle, transition `background-color` and `color` only,
  with a short duration (150-200ms) and the same easing across every token,
  rather than letting each CSS custom property's consumers animate
  independently at different implicit speeds.
- Disable transitions entirely during the very first theme application (page
  load, or a hard-set from a stored preference) — only animate a toggle the
  user explicitly clicks, never the initial state resolution.

Why: the flash happens because CSS and most component frameworks paint before
JavaScript has a chance to read localStorage or media-query state, so any
theme decision made after that first paint is visually a flash by definition.
A blocking inline script in `<head>` is the only reliable point that runs
before paint. The transition-consistency issue is separate: humans notice
even small timing mismatches between simultaneously changing colors far more
than they notice the absolute duration of a single fade.

Example: `<script>document.documentElement.dataset.theme = localStorage.theme
?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')</script>`
placed synchronously before any stylesheet link.

Counter-example: setting the theme class in a React `useEffect` after mount —
every dark-mode user sees the light theme for one frame (or longer on a slow
connection) on every page load.
