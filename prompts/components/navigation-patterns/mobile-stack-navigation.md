---
id: navigation-patterns-mobile-stack-navigation
title: Stack navigation within a tab, not across tabs
category: component
subcategory: navigation
tags: [navigation, mobile, tab-bar, stack-navigation]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Each tab in a bottom tab bar should own its own push/pop navigation stack, and
drilling into detail screens should never swap out or hide the tab bar — the
tab bar is the user's constant map of "which world am I in," and the stack
inside it is "how deep have I gone."

- Give each tab an independent navigation stack so switching tabs and switching
  back returns the user to exactly where they left that tab (preserved scroll
  position, preserved stack depth) — never reset a tab's stack to its root on
  every tab switch.
- Detail/drill-down screens push onto the current tab's stack with a back
  chevron (top-left on iOS, system back on Android); they do not spawn a new
  tab or replace the tab bar's contents.
- Keep the tab bar visible at every stack depth unless the screen is a genuine
  full-screen takeover (camera, media player, onboarding) that should use modal
  presentation instead of a push, precisely because it needs to hide the tab
  bar.
- Tapping the active tab's icon a second time should pop its stack to root, not
  do nothing — this is the fastest "take me home" gesture users expect.
- Cross-tab navigation (a notification that should open a detail screen living
  under a different tab) should switch tabs first, then push onto that tab's
  stack, preserving both stacks rather than improvising a screen with no tab
  bar at all.

Why: users build a spatial model of "5 tabs, each a corridor I can walk deeper
into," and that model breaks the moment a push replaces the tab bar or a tab
switch discards depth — both cost users their place and force them to re-find
where they were.

Example: "Feed tab pushes Post Detail pushes Commenter Profile, tab bar stays
docked at bottom throughout."

Counter-example: tapping a post replaces the whole screen including the tab
bar, then Back returns to a reset, scrolled-to-top feed instead of where the
user was.
