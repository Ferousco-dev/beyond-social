// Package purge erases what a deleted account made: its files and every row of its content. Payments, invoices, subscriptions, the
// credit ledger and the admin audit log are kept, because they are financial
// and legal records, and the profile stays as an anonymous stub they point to.
package purge

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"
)

// Paths are the stored files that belong to one person.
type Paths struct {
	// Media are objects in the media bucket, Footage in the avatar recording bucket.
	Media   []string
	Footage []string
}

type Store interface {
	// Pending lists deleted accounts whose content has not been erased yet.
	Pending(ctx context.Context, limit int) ([]string, error)
	Paths(ctx context.Context, userID string) (Paths, error)
	// Erase removes every row of content and anonymises the profile, in one step.
	Erase(ctx context.Context, userID string) error
}

// LogRetention is how long operational logs are kept while an account stays
// open: token counts, usage events and provider spend. Thirteen months covers
// a yearly plan and its renewal; older rows serve no purpose and are deleted.
const LogRetention = 395 * 24 * time.Hour

// pruneEvery spaces out the log clean-up; it needs no more than a daily pass.
const pruneEvery = 24 * time.Hour

// Pruner deletes operational logs older than a cut-off. A store that cannot
// prune simply keeps them.
type Pruner interface {
	PruneLogs(ctx context.Context, before time.Time) (int64, error)
}

type Files interface {
	Delete(ctx context.Context, bucket, path string) error
}

type Purger struct {
	store         Store
	files         Files
	mediaBucket   string
	footageBucket string
	lastPrune     time.Time
}

func New(store Store, files Files, mediaBucket, footageBucket string) *Purger {
	return &Purger{store: store, files: files, mediaBucket: mediaBucket, footageBucket: footageBucket}
}

// Purge erases one account's content: its stored files first, then its rows.
// Repeating it is safe.
func (p *Purger) Purge(ctx context.Context, userID string) error {
	paths, err := p.store.Paths(ctx, userID)
	if err != nil {
		return err
	}
	var failed []error
	for _, path := range paths.Media {
		if err := p.files.Delete(ctx, p.mediaBucket, path); err != nil {
			failed = append(failed, err)
		}
	}
	for _, path := range paths.Footage {
		if err := p.files.Delete(ctx, p.footageBucket, path); err != nil {
			failed = append(failed, err)
		}
	}
	// A file that could not be removed keeps its row, so the next run finds it again.
	if err := errors.Join(failed...); err != nil {
		return fmt.Errorf("purge: files: %w", err)
	}
	return p.store.Erase(ctx, userID)
}

// Run erases deleted accounts that were missed, on a schedule, until ctx ends.
func (p *Purger) Run(ctx context.Context, every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		p.once(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (p *Purger) once(ctx context.Context) {
	p.prune(ctx, time.Now())
	ids, err := p.store.Pending(ctx, 20)
	if err != nil {
		slog.Error("list accounts to purge", "error", err)
		return
	}
	for _, id := range ids {
		if err := p.Purge(ctx, id); err != nil {
			slog.Error("purge account", "user", id, "error", err)
		}
	}
}

// prune deletes old operational logs at most once a day.
func (p *Purger) prune(ctx context.Context, now time.Time) {
	pruner, ok := p.store.(Pruner)
	if !ok || now.Sub(p.lastPrune) < pruneEvery {
		return
	}
	p.lastPrune = now
	n, err := pruner.PruneLogs(ctx, now.Add(-LogRetention))
	if err != nil {
		slog.Error("prune old logs", "error", err)
		return
	}
	if n > 0 {
		slog.Info("pruned old logs", "rows", n)
	}
}
