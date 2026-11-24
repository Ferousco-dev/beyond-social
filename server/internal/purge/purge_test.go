package purge

import (
	"context"
	"errors"
	"testing"
	"time"
)

type memStore struct {
	pending []string
	paths   Paths
	erased  []string
}

func (m *memStore) Pending(context.Context, int) ([]string, error) { return m.pending, nil }
func (m *memStore) Paths(context.Context, string) (Paths, error)   { return m.paths, nil }
func (m *memStore) Erase(_ context.Context, id string) error {
	m.erased = append(m.erased, id)
	return nil
}

type memFiles struct {
	deleted []string
	failOn  string
}

func (f *memFiles) Delete(_ context.Context, bucket, path string) error {
	if path == f.failOn {
		return errors.New("storage is down")
	}
	f.deleted = append(f.deleted, bucket+"/"+path)
	return nil
}

func TestPurgeRemovesFilesThenRows(t *testing.T) {
	store := &memStore{paths: Paths{Media: []string{"u/m1.mp4"}, Footage: []string{"u/twin.mp4"}}}
	files := &memFiles{}
	if err := New(store, files, "user-media", "avatars").Purge(context.Background(), "u1"); err != nil {
		t.Fatal(err)
	}
	if len(files.deleted) != 2 || files.deleted[0] != "user-media/u/m1.mp4" || files.deleted[1] != "avatars/u/twin.mp4" || len(store.erased) != 1 {
		t.Fatalf("files=%v erased=%v", files.deleted, store.erased)
	}
}

func TestAnythingThatCannotBeRemovedKeepsTheRowsSoItIsRetried(t *testing.T) {
	ctx := context.Background()
	store := &memStore{paths: Paths{Media: []string{"u/m1.mp4", "u/m2.mp4"}}}
	files := &memFiles{failOn: "u/m1.mp4"}
	if err := New(store, files, "user-media", "avatars").Purge(ctx, "u1"); err == nil || len(store.erased) != 0 {
		t.Fatalf("a failed file delete still erased the rows: %v erased=%v", err, store.erased)
	}
}

func TestTheJobFindsAccountsThatWereMissed(t *testing.T) {
	store := &memStore{pending: []string{"u1", "u2"}}
	p := New(store, &memFiles{}, "m", "f")
	p.once(context.Background())
	if len(store.erased) != 2 {
		t.Fatalf("erased = %v", store.erased)
	}
}

type pruningStore struct {
	memStore
	cutoffs []time.Time
}

func (p *pruningStore) PruneLogs(_ context.Context, before time.Time) (int64, error) {
	p.cutoffs = append(p.cutoffs, before)
	return 0, nil
}

func TestOldLogsArePrunedAtMostOnceADay(t *testing.T) {
	store := &pruningStore{}
	p := New(store, nil, "media", "footage")
	now := time.Date(2026, 11, 24, 9, 0, 0, 0, time.UTC)
	p.prune(context.Background(), now)
	p.prune(context.Background(), now.Add(time.Hour))
	if len(store.cutoffs) != 1 || !store.cutoffs[0].Equal(now.Add(-LogRetention)) {
		t.Fatalf("cutoffs = %v", store.cutoffs)
	}
	p.prune(context.Background(), now.Add(25*time.Hour))
	if len(store.cutoffs) != 2 {
		t.Fatalf("a day later it should prune again: %v", store.cutoffs)
	}
}
