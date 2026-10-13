# Provider pricing research (12 Oct 2026)

Prices are USD, from each provider's own page unless marked. Re-check before
setting credit prices: several of these change.

## Language models (per 1M tokens, input / output)

| Model | Input | Output | Notes |
|---|---|---|---|
| Claude Haiku 5.5 | $0.10 | $0.50 | cache read $0.01; prompts up to 100k tokens |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | older, cheapest Gemini |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | |
| **Gemini 3.8 Flash** (what the planner uses) | $0.75 | $3.75 | rates stated valid to 31 Dec 2026; many Gemini rates roughly double on 1 Jan 2027 |
| Claude Sonnet 5.5 | $2.00 | $10.00 | cache read $0.10 |
| Gemini 3.1 Pro (preview) | $2.00 | $12.00 | |
| Claude Opus 5.5 | $4.00 | $20.00 | |
| Claude Fable 5.1 | $10.00 | $50.00 | |

Source: ai.google.dev/gemini-api/docs/pricing, platform.claude.com/docs/en/about-claude/pricing.
Claude Haiku 5.5 is about 7x cheaper than the Gemini 3.8 Flash the planner uses.
The Go server has no Anthropic client yet, so switching the planner is work, not a setting.

## Video generation

| Service and model | Price | Source |
|---|---|---|
| **KIE Wan 2.6** (what transforms use) | 720p: 70 credits (~$0.35) for 5 s, 140 (~$0.70) for 10 s. 1080p: 105 (~$0.53) for 5 s, 210 (~$1.05) for 10 s | kie.ai/wan-2-6. 200 credits = $1. The page shows one card for all Wan 2.6 modes; third parties say video-to-video may also bill the input clip's length, so confirm with one real run |
| KIE Kling 3.0 omni, transformation | 720p $0.10/s, 1080p $0.135/s, 4K $0.335/s | kie.ai/pricing |
| KIE Kling 3.0 omni, text/image to video | 720p $0.07-0.09/s, 1080p $0.09-0.115/s | kie.ai/pricing |
| Google Veo 3.1 Lite | $0.05/s (720p), $0.08/s (1080p) | Gemini pricing page |
| Google Veo 3.1 Fast | $0.10/s (720p), $0.12/s (1080p), $0.30/s (4K) | Gemini pricing page |
| Google Veo 3.1 Standard | $0.40/s (720p/1080p), $0.60/s (4K) | Gemini pricing page |

A 5 s 720p Wan 2.6 transform costs about $0.35, about $0.07 per second.

## HeyGen (avatar video)

HeyGen's own API pricing page is behind a login, so these are third-party estimates:
API usage is billed from a USD wallet separate from Studio credits; Avatar IV is
quoted at about $0.05-0.10 per second ($3-6 per minute); a self-serve account
starts with a small wallet (reported as $5). Studio plans (Creator $29/month,
600 credits) do not fund the API. Digital twin creation and voice clone cost are
not published anywhere I could reach. **Confirm in the HeyGen API dashboard
before pricing avatar videos.**

## Data and tooling

| Service | Price | Source |
|---|---|---|
| Apify TikTok scraper (clockworks) | $0.0037/result (free tier), falling to $0.0005 on higher tiers; $0.001 per run start; video download add-on $0.0013/result | Apify actor page |
| Apify Instagram scraper | $0.0027/result (free tier) down to $0.0005 | Apify actor page |
| Stripe cards | 2.9% + 30 cents (US); +1.5% international; +1% currency conversion; $15 per dispute | stripe.com/pricing |

A 20-result TikTok search costs about $0.075 (about $0.10 with the run start and cost cap).

## Hosting (general knowledge, not re-verified today)

Render: the smallest always-on web service is about $7/month. Supabase Pro is
about $25/month before usage. Check both before launch.

## What this means for credits (input to M4)

- One cheap action: a discovery (~$0.08).
- One planning call on Gemini 3.8 Flash with a typical 3k-in / 1k-out prompt:
  about $0.006. LLM calls are not the cost driver.
- The cost drivers are video: a 5 s Wan transform is ~$0.35, a HeyGen avatar
  video is likely $3-6 per minute, and a trained digital twin is a one-off cost
  to be confirmed.
- Credits should therefore be priced per action from the table above plus a
  margin, held in an admin-editable table so price changes need no deploy.
