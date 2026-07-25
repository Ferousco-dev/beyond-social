# feedback/ - subsystem, not a data folder

Feedback is **high-write runtime data** (potentially millions of events); it
belongs in Postgres, not files.

- **Signals:** accepted, rejected, edited (with edit distance), regenerated.
- **Model:** each in-context chunk's quality is a Beta posterior updated per
  event (`feedback/scoring.ts`); the posterior mean is the score, its variance
  is confidence.
- **Attribution:** uniform credit across the chunks that shaped a generation
  (`feedback/attribution.ts`).
- **Where it lives:** `prompt_scores` (live scores) and the app's generation
  records; applied via `prompt_apply_scores` (migration `0007`).
- **Decay & retirement:** popularity decays over time; high-confidence,
  low-quality chunks become deprecation candidates (`feedback/decay.ts`).

The loop: outcome -> `PromptEngine.recordFeedback` -> Beta update -> future
retrieval ranks the chunk differently.
