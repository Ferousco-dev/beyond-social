package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EntitlementCounter counts what a user has already used, for Free plan limits.
type EntitlementCounter struct{ pool *pgxpool.Pool }

func NewEntitlementCounter(pool *pgxpool.Pool) *EntitlementCounter {
	return &EntitlementCounter{pool: pool}
}

// Avatars counts avatars that exist or are being made. A failed one does not count against the limit.
func (c *EntitlementCounter) Avatars(ctx context.Context, userID string) (int, error) {
	var n int
	err := c.pool.QueryRow(ctx, `select count(*) from public.avatars where user_id = $1 and training_status <> 'failed'`, userID).Scan(&n)
	return n, err
}

// Searches counts searches that were accepted, not ones that failed before running.
func (c *EntitlementCounter) Searches(ctx context.Context, userID string, since time.Time) (int, error) {
	var n int
	err := c.pool.QueryRow(ctx, `select count(*) from public.discoveries where user_id = $1 and kind = 'search' and created_at >= $2 and status <> 'failed'`, userID, since).Scan(&n)
	return n, err
}
