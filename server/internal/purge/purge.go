// Package purge erases what a deleted account made: its files, its avatars at
// HeyGen, and every row of its content. Payments, invoices, subscriptions, the
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
	AvatarIDs(ctx context.Context, userID string) ([]string, error)
	// Erase removes every row of content and anonymises the profile, in one step.
	Erase(ctx context.Context, userID string) error
}

type Files interface {
	Delete(ctx context.Context, bucket, path string) error
}

// Avatars removes an avatar everywhere, including at HeyGen.
type Avatars interface {
	Delete(ctx context.Context, userID, id string) error
}

type Purger struct {
	store         Store
	files         Files
	avatars       Avatars
	mediaBucket   string
	footageBucket string
}

func New(store Store, files Files, avatars Avatars, mediaBucket, footageBucket string) *Purger {
	return &Purger{store: store, files: files, avatars: avatars, mediaBucket: mediaBucket, footageBucket: footageBucket}
}

// Purge erases one account's content. Order matters: the avatar's trained copy at
// HeyGen goes first and a refusal stops everything, so a likeness is never
// reported gone while a copy still exists. Repeating it is safe.
func (p *Purger) Purge(ctx context.Context, userID string) error {
	avatarIDs, err := p.store.AvatarIDs(ctx, userID)
	if err != nil {
		return err
	}
	for _, id := range avatarIDs {
		if err := p.avatars.Delete(ctx, userID, id); err != nil {
			return fmt.Errorf("purge: avatar %s: %w", id, err)
		}
	}
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
