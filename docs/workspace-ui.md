# Workspace UI - the AI operating environment

The workspace is not a dashboard; it is an environment for operating a powerful
AI system. Every screen should communicate intelligence and intent before the
user generates anything. Reference points: Linear, Vercel, Cursor, Claude,
Notion AI, Perplexity.

This document is the design direction of record for the workspace redesign. It
complements [docs/ui.md](ui.md) (marketing/auth) and [docs/color.md](color.md).

## Principles

- Minimal but powerful. Every component earns its place; nothing decorative.
- Premium and intentional. Depth from contrast, spacing, and typography, never
  from glow, loud gradients, or gratuitous glass.
- Calm and focused. One primary action per view; generous negative space.
- Engineered feel. Precise alignment, crisp 1px hairlines, tabular numerals.
- Motion communicates state, never decorates.

## Theme: refined dark, scoped

The workspace renders dark regardless of the global theme. Marketing and auth
keep their light blue palette; the `dark` class is applied at the dashboard shell
root so the dark token set scopes to that subtree only
(`features/dashboard/components/dashboard-shell.tsx`).

Depth is built from **stepped surface lightness**, not shadow:

| Token        | Role                               | Dark value               |
| ------------ | ---------------------------------- | ------------------------ |
| `--canvas`   | App background (deepest)           | `#0b0b0e`                |
| `--paper`    | Surfaces, cards, panels            | `#141418`                |
| `--cloud`    | Raised / hover                     | `#1e1e24`                |
| `--hairline` | Separators (low-alpha white)       | `rgba(255,255,255,0.08)` |
| `--ink`      | Primary text                       | `#f4f4f5`                |
| `--ink-soft` | Secondary text                     | `#8a8a94`                |
| `--primary`  | Restrained accent (used sparingly) | `#3b82f6`                |

All tokens live once in `apps/web/src/app/globals.css`; components reference the
semantic Tailwind tokens (`bg-canvas`, `text-ink`, `border-hairline`), never raw
hex. Retheming means editing tokens, not components.

## Structure: panels, not pages

The workspace is one cohesive frame, not isolated pages:

- **Sidebar** - navigation + projects, collapsible, quiet until hovered.
- **Command bar / palette (Cmd-K)** - the signature interaction; navigate, act,
  and search from anywhere. Elevate the existing project search into a full
  command palette (actions + navigation + recent).
- **Main canvas** - the active surface (conversation, editor, overview).
- **Inspector / contextual controls** - right-side panel for settings of the
  current object, with progressive disclosure of advanced options.
- **Status / activity** - subtle affordance for generation progress and history.

## Type and spacing

- Type scale from a modular ratio (see docs/ui.md); tabular numerals for metrics.
- Generous spacing on an 8px rhythm; let content breathe.
- Strong hierarchy: one clear focal point per view, muted secondary elements.

## Interaction quality (the details that signal craft)

- Smooth, short transitions (150-220ms, ease-out); respect `prefers-reduced-motion`.
- Elegant loading: skeleton screens that match final layout, not spinners.
- Beautiful, guiding empty states: explain what happens next, offer the first
  action, never "No data available".
- Intelligent hover, keyboard shortcuts, drag-and-drop where it earns its place.

## Redesign roadmap (iterative; audit each screen before "done")

1. Foundation - dark token system + dark-scoped shell. **(done)**
2. App shell - refined sidebar, top command bar, status affordance.
3. Command palette - actions + navigation + search (Cmd-K).
4. Overview - re-tuned stat tiles, charts, and history for the dark environment.
5. Conversation / generation surface - the core creation flow.
6. Editor and inspector panels - contextual controls, progressive disclosure.
7. Empty, loading, and error states across every screen.
8. Responsive pass - desktop-first, polished on tablet and mobile.

Each step is its own reviewable increment; quality over speed.
