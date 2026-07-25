# Prompt Intelligence System (Prompt RAG)

A self-improving, retrieval-augmented prompt engine that composes prompts from
modular knowledge chunks, generates senior-quality product and UI design,
evaluates every output, and learns from what users accept, reject, and edit.

This document is the design of record. Implementation lives in the
`@beyond-social/prompt-engine` package; authored knowledge lives in this
`prompts/` tree; runtime data lives in Postgres + pgvector (migration `0007`).

## Design stance (what we deliberately did NOT do)

The brief suggested filesystem folders for `embeddings/`, `chunks/`, `memory/`,
`feedback/`, and `training/`. We split the world differently, because conflating
authored source with derived and runtime data does not survive contact with
"hundreds of thousands of chunks and millions of generations":

- **Authored knowledge** is the source of truth: human-written Markdown +
  frontmatter, version-controlled in git, reviewed via PR. That is what lives in
  `prompts/`. Diffable, auditable, revertible.
- **Derived artifacts** (chunks after splitting, embeddings, indexes) are a pure
  function of authored knowledge + the embedding model. They are **built, never
  committed** - committing embeddings means giant binary churn and a second
  source of truth that drifts. They live in the vector store, keyed by content
  hash so rebuilds are incremental.
- **Runtime signals** (feedback, quality scores, usage, learned candidates,
  generation logs) are **high-write, concurrent, and unbounded**. Files cannot
  take millions of concurrent writes; these live in Postgres.

So `embeddings/`, `chunks/`, `memory/`, `feedback/` are **subsystems with
schemas**, not directories of data. Their schemas are in
`packages/prompt-engine/src/schema`. This is the single most important
architectural decision here.

## The pipeline, end to end

```mermaid
flowchart LR
  A[Generation request] --> B[buildQueryText]
  B --> C[Embed query]
  C --> D[Hybrid search\ndense + sparse + filters]
  D --> E[Rerank\ncross-encoder]
  E --> F[Blend\nsim+quality+conf+pop]
  F --> G[MMR diversity]
  G --> H[Slot assign + token budget]
  H --> I[Compose prompt\nsystem + knowledge + task]
  I --> J[Generate\nClaude]
  J --> K[Evaluate\nLLM judge + checks]
  K -->|fails| J
  K -->|passes| L[Return + record]
  L --> M[User outcome]
  M --> N[Attribute feedback\nBeta update]
  N --> D
```

The loop closes: outcomes update chunk scores, which change future retrieval and
ranking. The system that generated your last video is not the one that generates
your next.

## Retrieval

Hybrid, because neither leg alone is enough:

- **Dense** (pgvector cosine over Voyage embeddings) captures semantic intent.
- **Sparse** (Postgres full-text / BM25-like) captures exact terms - product
  names, "pricing", "9:16" - that dense retrieval blurs.
- **Fusion** via Reciprocal Rank Fusion (`retrieval/fusion.ts`): scale-free, it
  fuses by rank so incomparable score distributions combine robustly.
- **Metadata pre-filter** (category, platform, product type, `status = active`)
  narrows candidates before ranking - cheap and precise.
- **Rerank** (`adapters/rerank.ts`): an optional cross-encoder scores each
  candidate jointly with the query for precision the bi-encoder misses.
- **Blend** (`retrieval/rank.ts`): final relevance =
  `w1·fusedSim + w2·rerank + w3·quality + w4·confidence + w5·popularity`.
  Weights are recipe-versioned, so ranking changes are reproducible.
- **Diversity** (`retrieval/mmr.ts`): MMR drops near-duplicates so the budget
  buys distinct knowledge.
- **Budget** (`content/tokens.ts`): greedy pack in slot order; the tail is
  dropped, so the best knowledge always survives truncation.

## Chunking

Authored files are already one-concept (enforced by review). The chunker splits
on H2 for multi-part files and re-splits anything over ~512 tokens on paragraph
boundaries, preserving the heading path. Before embedding, each section gets a
**contextual header** (Anthropic's contextual-retrieval technique) so a passage
carries where it belongs. Every chunk is an atomic knowledge unit: a claim, its
rationale, and ideally an example and a counter-example.

## Metadata schema

Every chunk carries (`schema/chunk.ts`): `id, title, category, subcategory,
tags[], applicability{platforms,productTypes,styles}, source, version,
priorQuality, body, contextualHeader, status, tokenCount, contentHash,
embeddingModel, embeddingDim, createdAt, updatedAt`. Live quality is separate
(`schema/scoring.ts`): a Beta posterior `(alpha, beta)` with denormalized
`qualityScore`, `confidence`, usage/accept/reject/edit counts, and time-decayed
`popularity`.

## Self-improvement (the feedback loop)

Quality is a **Beta-Bernoulli posterior**, not a running average
(`feedback/scoring.ts`). Each generation a chunk took part in is a trial:
accepted = success, rejected = failure, edited = partial success scaled by how
little changed, regenerated = soft failure. The posterior **mean** is the score;
its **variance** is confidence, so a chunk seen 3 times is trusted less than one
seen 300 at the same mean. This is why a single bad generation cannot tank an
established chunk - the opposite of naive +1/-1.

- **Attribution** (`feedback/attribution.ts`): uniform credit to all in-context
  chunks. Without counterfactual generations, uniform is the unbiased estimator;
  the update's conservatism keeps any one event small.
- **Learning new chunks**: heavy edits are mined by an extraction LLM pass into
  `source: learned` candidates with `status: candidate` - never auto-activated.
  They pass validation + dedup + review before becoming retrievable. This is how
  the base grows _without_ becoming bloated or poisoned.
- **Decay & retirement** (`feedback/decay.ts`): popularity decays so trends
  surface; high-confidence low-quality chunks become deprecation candidates.

## Evaluation

Every output is graded before it ships (`evaluation/`). An LLM judge scores 11
dimensions (branding, accessibility, spacing, typography, hierarchy, creativity,
originality, usability, responsiveness, product quality, consistency) with a
rationale each; deterministic checks (e.g. WCAG contrast, `evaluation/checks.ts`)
feed in where a rule is objective. **We** compute the weighted aggregate and
pass/fail from the versioned policy - the gate is auditable, not left to the
model. Below threshold, the critique is fed back and the output is regenerated up
to the policy's budget.

## Versioning & reproducibility

- Authored chunks: git history + a semantic `version` + `contentHash`.
- Embeddings: keyed by `(embeddingModel, contentHash)`; a model change re-embeds
  only what changed.
- Recipes: versioned compositions (`schema/recipe.ts`); every generation record
  stores `recipeId + recipeVersion + exact chunk ids/versions used`, so any past
  output is fully reproducible.

## Recommended technology

| Concern       | Recommendation                                                     | Why                                                                                                   |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Embeddings    | Voyage `voyage-3-large` (OpenAI `text-embedding-3-large` fallback) | Best retrieval quality; Anthropic-recommended. Behind `Embedder`.                                     |
| Vector store  | Supabase **pgvector** (HNSW)                                       | No new infra; transactional with scores/feedback; scales to millions with HNSW. Behind `VectorStore`. |
| Rerank        | Voyage `rerank-2.5` (optional)                                     | Cross-encoder precision; passthrough default.                                                         |
| Generation    | Claude (latest Opus) primary, GPT fallback                         | Quality; both behind `Llm`.                                                                           |
| Judge         | Claude Sonnet                                                      | Cheaper, ample for grading.                                                                           |
| Orchestration | BullMQ (existing) for async ingest                                 | Reuse the worker already in the repo.                                                                 |

Every provider sits behind a port (`ports.ts`), so swapping to Qdrant /
Turbopuffer / Pinecone, or to a different embedder, touches one adapter and
nothing else.

## Scalability path

pgvector + HNSW handles millions of chunks; partition `prompt_chunks` by category
if a single index grows hot. Ingestion is idempotent and batched, run on the
existing queue. Composed prompts and embeddings cache by content hash. Feedback
writes are cheap appends; scores recompute incrementally per event and in a
periodic decay sweep. When a single Postgres node is no longer enough, the
`VectorStore` port lets us lift embeddings into a dedicated store without
touching retrieval, composition, or the feedback math.

```

```
