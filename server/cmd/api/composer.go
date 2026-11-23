package main

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/videoedit"
)

// composer serves the New Video composer: prompt suggestions and edits of a
// person's own video, priced from the credit table.
type composer struct {
	rewriter videoedit.Rewriter
	edits    *videoedit.Service
	credits  *credits.Service
}

func (c composer) Rewrite(ctx context.Context, userID string, req videoedit.RewriteRequest) (string, error) {
	return c.rewriter.Rewrite(ctx, userID, req)
}

func (c composer) Measure(ctx context.Context, userID, videoID string) (float64, error) {
	return c.edits.Measure(ctx, userID, videoID)
}

func (c composer) Submit(ctx context.Context, userID string, r videoedit.Request, key string) (jobs.Job, bool, error) {
	return c.edits.Submit(ctx, userID, r, key)
}

func (c composer) EditRate(ctx context.Context) (int, error) {
	return c.credits.Quote(ctx, credits.ActionVideoEditSecond)
}
