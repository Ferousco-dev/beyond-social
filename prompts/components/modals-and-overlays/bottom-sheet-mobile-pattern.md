---
id: modals-and-overlays-bottom-sheet-mobile-pattern
title: Bottom sheets on touch screens
category: component
subcategory: modals-and-overlays
tags: [bottom-sheet, mobile, modal, touch]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app, e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

On a touch screen, a bottom sheet beats a centered modal for most tasks because it keeps content reachable by the thumb and reads as an extension of the page rather than a separate window.

- Anchor the sheet to the bottom edge, not centered with margins; centered modals push primary actions toward the top of a phone screen, out of thumb reach.
- Support drag-to-dismiss with a visible grab handle at the top of the sheet, and set a generous flick-down velocity threshold so a half-hearted swipe doesn't dismiss unsaved work.
- Size the sheet to its content by default rather than a fixed 90% viewport height, letting it grow to a max height with internal scroll only when content genuinely exceeds it.
- Keep the primary action reachable without scrolling on the smallest supported screen size; if it's buried below the fold, the sheet is carrying too much content.
- Round only the top corners; a bottom sheet with rounded bottom corners against the screen edge looks like a rendering bug.

Why: Thumb reach on a modern phone favors the bottom third of the screen, and a sheet that rises from the edge the user's hand is already near feels physically connected to the gesture that opened it, whereas a centered modal on mobile forces a stretch and reads as a desktop pattern ported over without adaptation.

Example: "Bottom sheet with a drag handle; 'Share to' actions in a single row of large tap targets near the bottom edge."
Counter-example: "A centered modal with 24px margins on all sides on a 375px-wide phone screen." The primary button ends up in the top third of the screen, exactly where a one-handed thumb can't comfortably reach.
