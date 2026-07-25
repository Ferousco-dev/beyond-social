# @beyond-social/prompt-engine

The Prompt Intelligence System: a self-improving Prompt RAG that composes prompts
from modular knowledge chunks, generates senior-quality UI/product design,
evaluates every output, and learns from user outcomes.

Design of record: [`prompts/ARCHITECTURE.md`](../../prompts/ARCHITECTURE.md).
Storage: migration [`supabase/migrations/0007_prompt_rag.sql`](../../supabase/migrations/0007_prompt_rag.sql).

## Layout

```
src/
  schema/       Zod: chunk, scoring, feedback, evaluation, recipe (single source of truth)
  ports.ts      Interfaces: Embedder, VectorStore, Reranker, Llm (swap any provider)
  content/      Frontmatter parse, section chunking, contextual header, tokens, hashing
  retrieval/    Hybrid search: RRF fusion, blended ranking, MMR diversity, budgeting
  compose/      Prompt assembly (system layers + slotted knowledge + task + contract)
  feedback/     Beta-Bernoulli scoring, attribution, time-decay, retirement
  evaluation/   LLM-judge rubric, deterministic checks (WCAG contrast), policy gate
  ingest/       Parse -> chunk -> contextualize -> hash -> embed -> upsert (idempotent)
  adapters/     Voyage/OpenAI embeddings, Claude/OpenAI LLMs, rerank, pgvector store
  engine.ts     PromptEngine orchestrator (generate + recordFeedback)
scripts/
  validate-knowledge.ts   CI guard: validates prompts/ against the chunk schema
```

## Wiring it up

```ts
import {
  PromptEngine,
  VoyageEmbedder,
  ClaudeLlm,
  PassthroughReranker,
  SupabaseVectorStore,
} from "@beyond-social/prompt-engine";

const engine = new PromptEngine({
  embedder: new VoyageEmbedder(process.env.VOYAGE_API_KEY!),
  store: new SupabaseVectorStore(supabaseServiceClient), // structural: needs only .rpc
  reranker: new PassthroughReranker(),
  generator: new ClaudeLlm(process.env.ANTHROPIC_API_KEY!, "claude-opus-4-8"),
  judge: new ClaudeLlm(process.env.ANTHROPIC_API_KEY!, "claude-sonnet-5"),
  systemLayers, // Map<"system/persona"|"system/guardrails", string> loaded from prompts/system
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
});

const result = await engine.generate(userId, request, recipe);
// later, when the user acts:
await engine.recordFeedback({
  generationId,
  outcome: "accepted",
  editDistance: null,
  chunkIds,
  createdAt,
});
```

Ingestion (run on the worker for large corpora):

```ts
const ingestor = new Ingestor(new VoyageEmbedder(key), store);
await ingestor.ingest(files, new Date().toISOString());
```

## Design notes

- **No new runtime deps**: provider adapters are thin `fetch` shells; the store
  needs only a structural `.rpc` client (the app's supabase-js satisfies it).
- **Everything behind a port**: swap Voyage->OpenAI, pgvector->Qdrant, or
  Claude->GPT by changing one adapter.
- **Reproducible**: every generation records the exact recipe + chunk versions.
