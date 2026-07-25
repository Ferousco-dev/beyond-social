# memory/ - subsystem, not a data folder

"Memory" is the accumulated, queryable record the system learns from. It is
runtime data in Postgres, not files.

Two tiers:

- **Semantic memory** - the knowledge base itself (`prompt_chunks`), grown by
  ingesting authored files and, over time, promoting `learned` candidate chunks
  mined from user edits.
- **Episodic memory** - the log of generations (request, recipe + chunk versions
  used, outcome, evaluation), which powers attribution, offline evaluation, and
  reproducibility.

Long-lived brand or project preferences are also memory; they attach to the
generation request (`brandId`) and bias retrieval via metadata filters rather
than being baked into a prompt.
