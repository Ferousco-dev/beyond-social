# Services

This folder hosts the provider-bound integrations for the new architecture.

## Providers

- `apify/` Discovery and extraction for social references.
- `kie/` Video generation and video-to-video transformation.
- `heygen/` Avatar registration and generation workflows.
- `gemini/` AI orchestration and evaluation layer.

## Contract rules

- Providers stay behind explicit interfaces.
- The Go backend is the only layer that may orchestrate provider calls.
- Results are validated before they are accepted into business workflows.
- Provider failures are retried and persisted with durable idempotency semantics.
