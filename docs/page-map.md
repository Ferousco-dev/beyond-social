# Page map

Every route in the web app (`client/src/app`), grouped by who sees it. Use this as the checklist for the design pass.
`L` = has a loading skeleton. `E` = has its own error screen. Routes under `/dashboard` need sign-in.

## Public marketing (no sign-in)
| Route | What it is | Notes |
|---|---|---|
| `/` | Landing page | Sections live in `components/landing/` (hero, pricing, etc.) |
| `/pricing` | Plans and credit packs | Reads live plan info from the API |
| `/about`, `/careers`, `/community`, `/contact` | Company pages | Static |
| `/blog`, `/blog/[slug]` | Blog | Posts managed in Admin → Blog |
| `/help`, `/status` | Help centre, system status | |
| `/privacy`, `/terms`, `/security` | Legal | Static |
| `/offline` | Offline fallback | PWA |
| `/welcome` | After a Stripe payment | Shows "Activating Pro" until the webhook lands |

## Auth
| Route | What it is |
|---|---|
| `/login`, `/signup` | Sign in, create account |
| `/verify` | Email verification |
| `/forgot-password`, `/reset-password` | Password reset |
| `/account-deleted` | After deleting an account |

## Product (signed in)
| Route | What it is | L |
|---|---|---|
| `/dashboard` | Redirects to `/dashboard/new` | L |
| `/dashboard/new` | New Video: four starting points | |
| `/dashboard/videos/new` | Configure video (5-step form, review, generate) | L |
| `/dashboard/trends` | Trending video search | L |
| `/dashboard/projects` | Your editor projects and rendered videos | L |
| `/editor`, `/editor/[id]` | Video editor (full screen, outside the dashboard layout) | L (index) |
| `/dashboard/assets`, `/dashboard/assets/[id]` | Faces, voices, environments, groups | L |
| `/dashboard/schedule` | Scheduled posts | L |
| `/dashboard/settings/connections` | YouTube, TikTok, Instagram accounts | L |
| `/dashboard/analytics` | Post performance | L |
| `/dashboard/settings/billing` | Plan, credit packs, history (`/dashboard/credits` redirects here) | L |
| `/dashboard/usage` | Pro limits, overage settings | L |
| `/dashboard/settings` + `/account`, `/appearance`, `/billing`, `/memory` | Settings | L (not billing/memory) |
| `/dashboard/unavailable` | Shown for switched-off pages | |

## Admin (admins only)
`/dashboard/admin` (overview), `/alerts`, `/blog` (+ `/new`, `/[id]`), `/monitoring`, `/packs`, `/pricing`, `/providers`, `/revenue`, `/setup`, `/users` (+ `/[id]`).

## System screens
`error.tsx`, `global-error.tsx`, `not-found.tsx`, `opengraph-image.tsx`, `editor/error.tsx`, `dashboard/error.tsx`, `dashboard/settings/error.tsx`.

## Shared pieces to restyle once
- `app/dashboard/layout.tsx` (sidebar, header, usage banner) and `dashboard/_skeleton.tsx`
- `components/ui/*` (buttons, chips, error state)
- `components/landing/*` (marketing sections)
- Design rules: `docs/ui.md`, `docs/design.md`, `docs/color.md`
