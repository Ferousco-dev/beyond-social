# Platform layers: where we actually are

An honest inventory against the 22-layer AI platform architecture, so planning
starts from facts rather than intentions. Updated as layers land.

Legend: **Built** (working and verified) · **Partial** (real but incomplete) ·
**Not started**.

| #   | Layer                  | Status    | What exists today                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Product                | Partial   | Landing, dashboard, editor, settings, credits, billing, usage dashboard, teams. No API keys or per-seat management UI.                                                                                                                                                                                                                                  |
| 2   | Identity & access      | Partial   | Supabase auth, sessions, RLS everywhere, organizations with owner/admin/member roles enforced in policy. No OAuth, MFA, or invitations.                                                                                                                                                                                                                 |
| 3   | AI experience          | Partial   | Chat surface, editor assistant, prompt library (`prompts/`), recipes as templates, chunk versioning. No playground or saved-prompt UI.                                                                                                                                                                                                                  |
| 4   | **AI gateway**         | **Built** | `packages/ai-gateway`: model registry with pricing, per-task routing, cross-provider fallback, retry with jittered backoff honouring `Retry-After`, token-bucket rate limiting, context-window checks, exact cost accounting, usage records on every attempt.                                                                                           |
| 5   | Model providers        | Partial   | Anthropic and OpenAI clients behind a `ProviderClient` port. Google, xAI, DeepSeek, Mistral, local are registry entries away.                                                                                                                                                                                                                           |
| 6   | AI orchestration       | Partial   | Typed tool definitions with validated dispatch and a bounded agent loop (step and spend ceilings, full transcript). No multi-agent handoff, memory, or reflection.                                                                                                                                                                                      |
| 7   | Knowledge (RAG)        | Built     | Hybrid dense+sparse retrieval, RRF fusion, MMR, quality-weighted ranking, contextual chunking, pgvector store, 55-chunk corpus.                                                                                                                                                                                                                         |
| 8   | Data processing        | Partial   | Firecrawl scrapes source pages to markdown and an extraction pass turns them into structured trends, stored with their source URL. No PDF, OCR, or transcription.                                                                                                                                                                                       |
| 9   | Background workers     | Built     | BullMQ queue, scheduler claiming due posts atomically, and a publish worker that posts direct to TikTok, Instagram, Facebook, and YouTube. Permanent failures (revoked token, rejected video) stop retrying instead of burning five attempts.                                                                                                           |
| 10  | Storage                | Built     | Postgres, pgvector, Supabase object storage, Redis.                                                                                                                                                                                                                                                                                                     |
| 11  | API platform           | Partial   | Versioned REST at `/api/v1` with hashed API keys, bearer auth failing closed, in-app key management, per-key rate limiting, an OpenAPI 3.1 spec, and a TypeScript SDK. No outbound webhooks.                                                                                                                                                            |
| 12  | Infrastructure         | Partial   | Vercel deploys, Docker Compose for Redis. No k8s, GPU, or autoscaling.                                                                                                                                                                                                                                                                                  |
| 13  | Security               | Partial   | CSP, HSTS, RLS, service-role isolation, constant-time webhook auth, auth rate limiting, Zod at boundaries, prompt-injection screening and input/output moderation in the gateway. No malware scanning or secret management.                                                                                                                             |
| 14  | AI evaluation          | Built     | 11-dimension LLM judge with deterministic checks, versioned policy gate, golden retrieval set.                                                                                                                                                                                                                                                          |
| 15  | Observability          | Partial   | Structured logger, health/readiness probes, per-call latency/tokens/cost persisted to `ai_usage`, a usage dashboard, and request tracing: W3C `traceparent` is continued across hops, every log line carries `traceId`/`spanId`, and the id is returned on the response and in error bodies. No collector export yet.                                   |
| 16  | Billing                | Partial   | Credits with idempotent charge-on-completion and a ledger, Stripe Checkout, subscription webhook granting credits exactly once, and the billing portal. No invoices UI, proration, or usage-based overage.                                                                                                                                              |
| 17  | Analytics              | Partial   | Real AI usage analytics (spend, calls, cache rate, latency, failure rate) and real product analytics derived from our own tables: daily generation volume, success rate, a generated/ready/published funnel, and published posts per platform. Platform view counts need insights APIs we have not integrated, so they are absent rather than invented. |
| 18  | Admin platform         | Partial   | Admin console with platform health, feature flags, and a knowledge review query, all admin-gated in the database. Flags gate the prompt engine, learning auto-promotion, and the public API. No user management or support tooling.                                                                                                                     |
| 19  | Developer platform     | Partial   | OpenAPI 3.1 spec served unauthenticated at `/api/v1/openapi`, and a zero-dependency TypeScript SDK (`@beyond-social/sdk`) covering generations and usage. No CLI, no webhooks for customers, no hosted docs site yet.                                                                                                                                   |
| 20  | DevOps & SRE           | Partial   | CI runs lint, typecheck, build, gateway tests, knowledge validation. Vercel deploys. No blue-green, rollback drill, or incident process.                                                                                                                                                                                                                |
| 21  | Performance & cost     | Partial   | Cost-aware routing, cheap-task chains, a response cache for deterministic calls, and an embedding cache that serves repeated text from memory and collapses duplicates inside a batch. No streaming yet, and the caches are per-instance rather than shared.                                                                                            |
| 22  | AI safety & governance | Partial   | Rate limiting, review-gated learning, injection screening, and moderation on input and output. No abuse detection, consent flow, or retention policy.                                                                                                                                                                                                   |

## The gateway (layer 4)

Every model call now goes through one entry point. Callers name a **task**, not a
model, which is what lets routing, pricing, and fallbacks change without touching
call sites.

```
  caller ── task ──▶ AiGateway
                        │
                validate + rate limit
                        │
                 model chain for task
                  │      │       │
              Claude   Claude   GPT      ◀── retry each, then fall through
              Opus     Sonnet   4o
                        │
                 usage record (tokens, cost, latency, attempts)
```

Design notes worth keeping:

- **Retry classification is the whole job.** 429/5xx/network are transient and
  worth another attempt; 400/401/403 are terminal and retrying them only costs
  money. Backoff uses full jitter so many clients do not retry in lockstep, and
  a provider's `Retry-After` always wins over our schedule.
- **Fallback chains span providers deliberately**, so a single vendor outage is
  survivable rather than fatal.
- **Cost comes from the provider's reported token counts**, not estimates.
  Estimation is used only pre-flight, for context-window and rate-limit checks.
- **Failures are recorded too.** A usage row is written for every attempt, which
  is what makes error rate and wasted spend visible.
- The in-process limiter and in-memory usage sink are correct for one worker and
  approximate across a fleet; `RateLimiter` and `UsageSink` are the seams where
  Redis and a database drop in.

Verified by `pnpm --filter @beyond-social/ai-gateway test`, which runs the
gateway against fake providers (no keys, no network) and asserts retry, fallback,
cost arithmetic, failure recording, rate limiting, and missing-provider handling.

## Suggested order for what is left

1. ~~Caching (21)~~ — **done**: deterministic responses are cached in the
   gateway, keyed on task plus prompt plus sampling parameters, and skipped when
   temperature is non-zero. Embedding caching is still open.
2. ~~Prompt-injection and moderation (13, 22)~~ — **done**: weighted injection
   detection, fenced untrusted content, and input/output moderation, all
   enforced in the gateway before any spend. Abuse detection and retention
   policy are still open.
3. ~~Billing (16)~~ — **done**: Stripe Checkout, a signature-verified webhook
   that grants plan credits exactly once, and the billing portal. Invoices and
   overage are still open.
4. ~~Usage dashboard (1, 15, 17)~~ — **done**: gateway usage persists to
   `ai_usage` (RLS-scoped, service-role writes) and surfaces at
   `/dashboard/usage` with spend, cache rate, latency, and failure rate.
5. ~~Orgs, teams, RBAC (1, 2)~~ — **done**: organizations, membership with
   three roles, RLS policies enforcing them, and a team page. Invitations and
   an org switcher are still open.

## Next

1. **API platform (11)** — public REST, keys, and webhooks out.
2. ~~Orchestration (6)~~ — **done** for tools and a single bounded agent;
   multi-agent handoff, agent memory, and reflection remain.
3. **Data processing (8)** — PDF, OCR, transcription for knowledge ingestion.
