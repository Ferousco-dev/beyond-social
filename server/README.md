# Server

Go API for Beyond Social. Supabase provides Postgres and auth; this service
owns the authenticated API, job state, and realtime events. The frontend lives
in `../client`.

## Layout

- `cmd/api`: entrypoint, wiring, graceful shutdown.
- `internal/config`: environment loading and validation.
- `internal/auth`: Supabase access-token verification (JWKS, ES256/RS256, legacy HS256).
- `internal/database`: pgx pool, versioned migrations, job store.
- `internal/jobs`: job model, lifecycle rules, service.
- `internal/realtime`: per-user WebSocket hub and handler.
- `internal/apify`, `internal/kie`: provider clients (requests, parsing, error classification).
- `internal/discovery`: TikTok/Instagram discovery, history and results.
- `internal/transform`: video-to-video workflow and its background processor.
- `internal/worker`: leased background polling shared by both.
- `internal/storage`: Supabase Storage (signed URLs and deletion for private recordings).
- `internal/safenet`: SSRF-safe fetching of untrusted media URLs.
- `internal/http`: routes, handlers, JSON responses.
- `migrations`: embedded, versioned SQL applied at startup.

## Run

```bash
cp .env.example .env   # fill in SUPABASE_URL and DATABASE_URL
go run ./cmd/api
```

Startup fails with a clear error on invalid configuration, an unreachable
database, or a failed migration.

## API

Success responses are `{"data": ...}`; errors are
`{"error": {"code": "...", "message": "..."}}`. Authenticated routes need
`Authorization: Bearer <supabase access token>`.

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | no | Process is alive. |
| `GET /ready` | no | PostgreSQL reachable (503 otherwise). |
| `GET /api/v1/me` | yes | Identity from the verified token. |
| `GET /api/v1/jobs?limit=&offset=` | yes | Caller's jobs, newest first (limit 1-100, default 25). |
| `GET /api/v1/jobs/{id}` | yes | One of the caller's jobs; 404 for missing and foreign IDs alike. |
| `POST /api/v1/discover` | yes | Start a search (`{platform, query, limit}`) or look up one video (`{url}`). Returns 202 at once. |
| `GET /api/v1/discover/{id}` | yes | Discovery status. |
| `GET /api/v1/discover/{id}/videos?limit=&offset=` | yes | Its videos. |
| `POST /api/v1/jobs/video-transform` | yes | `{video_id, prompt?}` from a discovered video. 202 with the job, or 200 for a repeated `Idempotency-Key`. |
| `POST /api/v1/callbacks/kie` | signature | KIE completion webhook; only names a task, the outcome is re-read from KIE. |
| `GET /api/v1/videos/{id}` | yes | The video job; a completed one carries a fresh file URL. |
| `GET /ws` | in-band | WebSocket, see below. |

## Video workflow

1. `POST /discover` queues a search; a worker runs the Apify actor (cost capped per run), normalises rows, and stores them. Events: `discovery.updated`.
2. `POST /jobs/video-transform` references a stored video, so the source is never a client-supplied URL. The worker re-scrapes that one post for a fresh file URL, downloads it through `safenet` (https only, public addresses only, 10 MB cap, container sniffed from bytes), uploads it to KIE, and creates a `wan/2-6-video-to-video` task.
3. KIE's callback or periodic polling re-reads the task from KIE's API. A job becomes `completed` only when KIE reports success with a result URL. Events: `job.updated`.

Work is leased in Postgres (`next_run_at`), so a restart resumes jobs. A job that died between "submitting" and recording KIE's task ID is failed rather than resubmitted, because resubmitting could bill twice.


## Authentication

Tokens are verified for signature (keys fetched from the project's JWKS and
refreshed on key rotation), issuer, `authenticated` audience, expiry and a UUID
`sub`. The user ID comes only from the verified token. Set
`SUPABASE_JWT_SECRET` only if the project still signs with the legacy shared
secret.

## WebSocket protocol

Browsers cannot set headers on a WebSocket and URLs end up in logs, so:

1. Open `wss://<host>/ws` from an origin listed in `WEBSOCKET_ALLOWED_ORIGINS`.
2. Within 5 seconds send `{"type":"auth","token":"<access token>"}`.
3. The server replies with a `connection.ready` event, then pushes only that
   user's events. Anything else closes the socket with code 1008.

Every message is `{"type","resource_id","timestamp","payload"}`. Job events are
`job.created` and `job.updated` with the job as payload. The server pings every
30s and drops clients that stop answering or cannot keep up.

## Deploying to Render

`render.yaml` at the repo root defines the service (build `go build -o bin/api ./cmd/api`, health check `/health`, `APP_ENV=production`). Render injects `PORT`. Every secret is marked `sync: false`, so it is entered once in the Render dashboard.

- `DATABASE_URL` must be Supabase's pooled **session** connection string; the direct host is IPv6 only.
- The service runs background workers and WebSockets, so it needs an always-on instance, not a free tier that sleeps.
- Set `WEBSOCKET_ALLOWED_ORIGINS` to the deployed frontend and `PUBLIC_BASE_URL` to the service's own URL.

## Migrations

`migrations/*.sql` are embedded and applied in order at startup, each in its own
transaction and recorded in `public.schema_migrations` with a checksum. Never
edit an applied file; add a new one.

## Tests

```bash
go test ./...
```

Database tests need a disposable PostgreSQL whose name ends in `_test`; they
are skipped otherwise:

```bash
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/beyond_test go test ./internal/database
```
