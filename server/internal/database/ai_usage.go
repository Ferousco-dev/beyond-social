package database

import (
	"context"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AIUsageStore struct {
	pool *pgxpool.Pool
	// UserFallback names the caller when a call carries no explicit scope, for
	// example the signed-in user of the request.
	UserFallback func(ctx context.Context) string
}

func NewAIUsageStore(pool *pgxpool.Pool) *AIUsageStore { return &AIUsageStore{pool: pool} }

// RecordUsage writes one row. It uses its own short deadline, detached from the
// caller, so a cancelled request still records what the provider already charged.
func (s *AIUsageStore) RecordUsage(ctx context.Context, r gemini.Record) {
	if r.UserID == "" && s.UserFallback != nil {
		r.UserID = s.UserFallback(ctx)
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Second)
	defer cancel()
	_, err := s.pool.Exec(ctx, `
		insert into public.ai_usage (provider, model, purpose, user_id, job_id, input_tokens, output_tokens, total_tokens)
		values ($1, $2, $3, nullif($4, '')::uuid, nullif($5, ''), $6, $7, $8)`,
		r.Provider, r.Model, r.Purpose, r.UserID, r.JobID,
		r.Usage.PromptTokens, r.Usage.CandidatesTokens, r.Usage.TotalTokens)
	if err != nil {
		slog.Warn("record ai usage", "error", err)
	}
}
