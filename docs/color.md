# Beyond Social - Design System Specification

You are the lead Product Designer responsible for creating the complete design language for Beyond Social.

This is a premium B2B SaaS platform powered by AI, but **it must never look like an "AI product."**

Design with the quality and restraint of Apple, Linear, Stripe, Notion, GitHub, and Vercel.

Every screen should feel handcrafted, intentional, and production-ready.

The interface should communicate trust, simplicity, speed, and precision.

---

# Core Design Principles

The product should feel:

- Premium
- Modern
- Professional
- Calm
- Minimal
- Elegant
- Fast
- Timeless

Do not chase design trends.

Avoid flashy visuals.

The software itself should be the focus.

---

# Color System

The design should be neutral-first.

Color should communicate actions and status, never decoration.

## Primary Accent

Apple-inspired Blue

```text
Primary Blue      #0066FF
Hover             #0052CC
Pressed           #0047B3
Focus Ring        #66A3FF
Soft Tint         #EAF2FF
```

Use the accent color only for:

- Primary buttons
- Active navigation
- Selected states
- Links
- Progress indicators
- Focus rings
- Interactive highlights

The blue should occupy less than 10% of the visible interface.

---

## Light Theme

```text
App Background    #F8FAFC
Surface           #FFFFFF
Surface Hover     #F9FAFB
Sidebar           #FFFFFF
Border            #E5E7EB
Divider           #F1F5F9
```

---

## Dark Theme

```text
App Background    #09090B
Surface           #111827
Sidebar           #0F172A
Border            #27272A
Divider           #1F2937
```

---

## Typography Colors

```text
Primary Text      #111827
Secondary Text    #4B5563
Muted Text        #6B7280
Disabled          #9CA3AF
```

Dark Mode

```text
Primary Text      #F9FAFB
Secondary Text    #D1D5DB
Muted Text        #9CA3AF
```

---

## Semantic Colors

Success

```text
#16A34A
```

Warning

```text
#F59E0B
```

Danger

```text
#DC2626
```

Information

```text
#2563EB
```

Never introduce unnecessary colors.

---

# Typography

Primary Font

Geist

Fallback

Inter

System

SF Pro Display (Apple)

Typography should create hierarchy through weight and spacing rather than oversized text.

Font Scale

```text
Display      48
H1           36
H2           30
H3           24
H4           20
Body         16
Small        14
Caption      12
```

Weights

```text
Regular      400
Medium       500
Semibold     600
Bold         700
```

Never use extra-bold typography.

---

# Layout

Use a 12-column responsive grid.

Maximum content width

```text
1440px
```

Spacing follows an 8-point system.

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Maintain generous whitespace.

Every layout should breathe.

---

# Components

## Buttons

Height

44px

Radius

10px

Primary

Solid Apple Blue

Secondary

Neutral surface with border

Ghost

Transparent

Destructive

Red

Buttons should feel understated and precise.

Never oversized.

---

## Inputs

Height

44px

Radius

10px

Border

1px neutral border

Focus

2px blue focus ring

Inline validation required.

---

## Cards

Radius

14px

Padding

24px

Border

Subtle

Shadow

Minimal or none

Never nest cards inside cards.

Only use cards when they improve readability.

---

## Navigation

Inspired by Linear.

Compact.

Clean.

Typography-led.

Lucide icons only.

Sidebar width

260px

Collapsed width

72px

Top navigation

64px height

---

# Dashboard

Prioritize useful information over decoration.

Surface only what helps users take action.

Examples

- Remaining credits
- Active projects
- Video generation progress
- Scheduled posts
- Recent activity
- Trend recommendations

Avoid dashboard clutter.

---

# AI Workspace

The conversational AI should feel closer to ChatGPT than a messaging app.

Large writing area.

Excellent typography.

Minimal interface.

Streaming responses.

No decorative message bubbles.

---

# Video Editor

Inspired by professional desktop software.

Reference

- Final Cut Pro
- DaVinci Resolve
- CapCut Desktop

Layout

Left

Media Library

Center

Video Preview

Bottom

Timeline

Right

Inspector Panel

Everything should feel like native creative software.

---

# Motion

Purposeful only.

Duration

150ms–200ms

Use motion for:

- State changes
- Hover
- Focus
- Dialogs
- Navigation
- Loading

Avoid decorative animation.

---

# Accessibility

WCAG AA compliant.

Keyboard navigation throughout.

Visible focus states.

Proper labels.

Semantic HTML.

Minimum touch targets of 44×44px.

---

# Performance

Design with performance in mind.

Avoid unnecessary visual complexity.

Prefer CSS over heavy animation libraries where possible.

Keep interfaces lightweight and responsive.

---

# Things to Avoid

Never produce generic AI SaaS visuals.

Avoid:

- Purple gradients
- Indigo-heavy themes
- Neon glows
- Glassmorphism everywhere
- Floating cards
- Giant rounded blobs
- Oversized hero sections
- Dribbble-inspired concepts
- Excessive shadows
- Decorative illustrations
- Fake charts
- Fake analytics
- Random icons

The product should feel engineered, not generated.

---

# Design Standard

Every screen should pass this test:

"If the Beyond Social logo were removed, would this interface still look like software designed by Apple, Stripe, or Linear rather than a template?"

If the answer is no, redesign it before proceeding.

The final result should be timeless, highly usable, visually restrained, and worthy of production deployment.
