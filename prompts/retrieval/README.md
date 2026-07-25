# retrieval/ - configuration notes

Retrieval behavior is configured by **recipes** (`prompts/templates/`), not by
loose files here. This folder documents the knobs and where they live.

- **Slots** - which categories to pull and how many, in prompt order. See a
  recipe's `slots`.
- **Ranking weights** - the blend of fused similarity, rerank, quality,
  confidence, popularity. See a recipe's `weights`.
- **`minSimilarity`** - floor below which a dense hit is discarded.
- **`mmrLambda`** - relevance/diversity trade-off (1 = pure relevance).
- **`knowledgeTokenBudget`** - hard cap on retrieved knowledge tokens.

Algorithms: hybrid dense+sparse search fused with Reciprocal Rank Fusion, an
optional cross-encoder rerank, quality-weighted blending, MMR diversity, and
token-budget packing. Implementation in
`packages/prompt-engine/src/retrieval/`.
