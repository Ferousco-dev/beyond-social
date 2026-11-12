package main

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// editorScenes joins the clip generator and the price list for the editor.
type editorScenes struct {
	generate *generate.Service
	credits  *credits.Service
}

func (e editorScenes) Submit(ctx context.Context, userID string, r generate.Request, key string) (jobs.Job, bool, error) {
	return e.generate.Submit(ctx, userID, r, key)
}

func (e editorScenes) Quote(ctx context.Context, seconds int, sound bool) (int, error) {
	rate, err := e.credits.Quote(ctx, credits.VideoAction(sound))
	return rate * seconds, err
}
