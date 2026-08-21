---
id: settings-and-account-pages-mobile-settings-drill-down
title: The mobile drill-down replacement for rail-plus-panel
category: layout
subcategory: mobile-navigation
tags: [settings, mobile, navigation, drill-down]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

On mobile, the rail-plus-panel pattern breaks down below roughly 600px of
width and should be replaced with a full-screen drill-down: one list of
section rows, each pushing a new screen with a native back control.

The recipe:

- Show a one-line current-value preview on each row where relevant, such as
  "Notifications: Push, Email" or "Plan: Pro," so the user can scan account
  state without opening every single screen.
- Use the platform's native disclosure indicator (chevron-right on iOS
  grouped tables, the equivalent Material list affordance on Android) rather
  than inventing a custom icon — consistency with the OS is what makes the
  row instantly readable as navigable.
- Return to the exact scroll position in the parent list on back navigation;
  resetting the list to the top on every back tap punishes anyone working
  down a long list of sections.
- Keep the danger zone at the bottom of its own drill-down screen even though
  screen space is tighter — do not promote destructive actions higher just
  because there's less room to scroll past them.

Why: push/pop navigation is the platform-native pattern for hierarchical
content on mobile, so following it means the app inherits swipe-back gestures
and existing muscle memory for free, instead of forcing users to learn a
bespoke tab bar or collapsible rail that fights how every other app on their
phone already behaves.

Example: a single "Settings" list screen with rows like "Notifications" and
"Security," each showing a subtitle summarizing current state, tapping pushes
a new screen with a native back chevron in the top-left.
Counter-example: a collapsed sidebar that slides in from the left as an
overlay on mobile, mimicking desktop rail-plus-panel — it covers the content
it's meant to navigate and requires an extra tap to dismiss before the user
can even see the panel underneath.
