package credits

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// memStore is a single-lock in-memory Store, enough to exercise the service
// rules. The SQL implementation is covered by the database tests.
type memStore struct {
	mu      sync.Mutex
	balance map[string]int
	keys    map[string]Entry
	prices  map[string]Price
}

func newMem() *memStore {
	return &memStore{balance: map[string]int{}, keys: map[string]Entry{}, prices: map[string]Price{
		"video_transform:5:720p": {Credits: 18, Enabled: true},
		ActionAvatarVideoSecond:  {Credits: 4, Enabled: true},
	}}
}

func (m *memStore) Apply(_ context.Context, e Entry) (int, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, dup := m.keys[e.Key]; dup {
		return m.balance[e.UserID], false, nil
	}
	if m.balance[e.UserID]+e.Amount < 0 {
		return m.balance[e.UserID], false, ErrInsufficient
	}
	m.balance[e.UserID] += e.Amount
	m.keys[e.Key] = e
	return m.balance[e.UserID], true, nil
}
func (m *memStore) Balance(_ context.Context, u string) (int, error) { return m.balance[u], nil }
func (m *memStore) Reserved(_ context.Context, jobID string) (int, error) {
	return -m.keys["reserve:"+jobID].Amount, nil
}
func (m *memStore) SpentSince(context.Context, string, time.Time) (int, error) { return 0, nil }
func (m *memStore) Setting(context.Context, string) (int, bool, error)         { return 0, false, nil }
func (m *memStore) Price(_ context.Context, a string) (Price, bool, error) {
	p, ok := m.prices[a]
	return p, ok, nil
}

func transformJob(id string) jobs.Job {
	return jobs.Job{ID: id, UserID: "u1", Type: "video_transform", Input: map[string]any{"duration": "5", "resolution": "720p"}}
}

func TestReserveRefusesWhenShortAndChargesNothing(t *testing.T) {
	m := newMem()
	m.balance["u1"] = 10
	b := NewJobBiller(NewService(m))
	if err := b.Reserve(context.Background(), transformJob("j1")); !errors.Is(err, ErrInsufficient) {
		t.Fatalf("err = %v", err)
	}
	if m.balance["u1"] != 10 {
		t.Fatalf("balance = %d", m.balance["u1"])
	}
}

func TestFailedJobIsRefundedOnceEvenIfFinishedTwice(t *testing.T) {
	m := newMem()
	m.balance["u1"] = 30
	b := NewJobBiller(NewService(m))
	ctx := context.Background()
	job := transformJob("j1")
	if err := b.Reserve(ctx, job); err != nil || m.balance["u1"] != 12 {
		t.Fatalf("reserve: %v balance=%d", err, m.balance["u1"])
	}
	job.Status = jobs.StatusFailed
	for range 2 {
		if err := b.Finish(ctx, job); err != nil {
			t.Fatal(err)
		}
	}
	if m.balance["u1"] != 30 {
		t.Fatalf("balance = %d, want 30", m.balance["u1"])
	}
}

func TestSettleAfterRefundDoesNotChargeOrRefundAgain(t *testing.T) {
	m := newMem()
	m.balance["u1"] = 30
	b := NewJobBiller(NewService(m))
	ctx := context.Background()
	job := transformJob("j1")
	_ = b.Reserve(ctx, job)
	job.Status = jobs.StatusFailed
	_ = b.Finish(ctx, job)
	job.Status = jobs.StatusCompleted
	_ = b.Finish(ctx, job)
	if m.balance["u1"] != 30 {
		t.Fatalf("balance = %d, want 30", m.balance["u1"])
	}
}

func TestAvatarVideoSettlesToRealLength(t *testing.T) {
	m := newMem()
	m.balance["u1"] = 100
	b := NewJobBiller(NewService(m))
	ctx := context.Background()
	// 150 characters is about 10 seconds: 40 credits reserved.
	script := ""
	for range 150 {
		script += "a"
	}
	job := jobs.Job{ID: "j2", UserID: "u1", Type: "avatar_video", Input: map[string]any{"script": script}}
	if err := b.Reserve(ctx, job); err != nil || m.balance["u1"] != 60 {
		t.Fatalf("reserve: %v balance=%d", err, m.balance["u1"])
	}
	job.Status = jobs.StatusCompleted
	job.Result = map[string]any{"duration_seconds": 7.2}
	if err := b.Finish(ctx, job); err != nil {
		t.Fatal(err)
	}
	// 8 seconds charged (32), 8 credits handed back.
	if m.balance["u1"] != 68 {
		t.Fatalf("balance = %d, want 68", m.balance["u1"])
	}
}

func TestConcurrentReservesCannotOverspend(t *testing.T) {
	m := newMem()
	m.balance["u1"] = 36
	b := NewJobBiller(NewService(m))
	var wg sync.WaitGroup
	var ok, short int
	var mu sync.Mutex
	for i := range 10 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := b.Reserve(context.Background(), transformJob(string(rune('a'+i))))
			mu.Lock()
			defer mu.Unlock()
			if err == nil {
				ok++
			} else if errors.Is(err, ErrInsufficient) {
				short++
			}
		}()
	}
	wg.Wait()
	if ok != 2 || short != 8 || m.balance["u1"] != 0 {
		t.Fatalf("ok=%d short=%d balance=%d", ok, short, m.balance["u1"])
	}
}

func TestDisabledOrUnpricedActionIsUnavailable(t *testing.T) {
	m := newMem()
	m.prices["video_transform:5:720p"] = Price{Credits: 18, Enabled: false}
	b := NewJobBiller(NewService(m))
	if err := b.Reserve(context.Background(), transformJob("j1")); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("err = %v", err)
	}
}

func TestAdjustNeedsAReason(t *testing.T) {
	s := NewService(newMem())
	if _, err := s.Adjust(context.Background(), "u1", 5, "k", "", "admin"); err == nil {
		t.Fatal("adjustment without a reason accepted")
	}
}
