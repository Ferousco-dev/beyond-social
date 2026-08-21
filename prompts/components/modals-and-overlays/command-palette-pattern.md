---
id: modals-and-overlays-command-palette-pattern
title: The command palette overlay
category: component
subcategory: modals-and-overlays
tags: [command-palette, overlay, keyboard-shortcut, power-user]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A command palette is a search-first overlay for people who already know what they want, so it should optimize for keystrokes-to-result, not for browsability; it is not a menu wearing a search box.

- Trigger it with a single, memorable, OS-idiomatic shortcut such as Cmd/Ctrl+K, and make it discoverable via a visible hint, like a search icon with a "⌘K" badge, in the UI it replaces.
- Rank results by fuzzy match on the query first and recency or frequency of use second; an exact literal match should never lose to a "featured" or alphabetically-first item.
- Support both actions, such as "Create new project," and navigation, such as "Go to Settings," in one list, distinguished by icon or a subtle category label rather than separate palettes.
- Keep it fully keyboard-operable: arrow keys to move, Enter to select, Escape to close; mouse interaction should work but never be required for any path through it.
- Open instantly with no loading spinner for local actions or navigation; if results require a network round trip, show local matches immediately and stream remote ones in without blocking the input.

Why: The palette exists to remove the cost of hunting through nested menus for someone who already has the destination in their head. Every millisecond of input lag, or every ranking that buries an exact match, reintroduces the exact friction the feature was built to remove.

Example: "Cmd+K opens the palette; typing 'inv' surfaces 'Create invoice' as the top exact-prefix match instantly."
Counter-example: "A command palette that requires a full page load and shows results only after a 400ms network fetch." The lag defeats the palette's entire premise of being faster than clicking through menus.
