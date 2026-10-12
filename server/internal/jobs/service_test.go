package jobs

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// memRepo mirrors the ownership and lifecycle contract of the SQL store.
type memRepo struct {
	mu   sync.Mutex
	rows []Job
}

func (m *memRepo) Create(_ context.Context, job Job) (Job, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if job.IdempotencyKey != "" {
		for _, j := range m.rows {
			if j.UserID == job.UserID && j.IdempotencyKey == job.IdempotencyKey {
				return j, false, nil
			}
		}
	}
	job.ID = fmt.Sprintf("job-%d", len(m.rows)+1)
	m.rows = append(m.rows, job)
	return job, true, nil
}

func (m *memRepo) List(_ context.Context, userID string, limit, offset int) ([]Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var owned []Job
	for _, j := range m.rows {
		if j.UserID == userID {
			owned = append(owned, j)
		}
	}
	if offset >= len(owned) {
		return nil, nil
	}
	return owned[offset:min(offset+limit, len(owned))], nil
}

func (m *memRepo) Get(_ context.Context, userID, id string) (Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, j := range m.rows {
		if j.ID == id && j.UserID == userID {
			return j, nil
		}
	}
	return Job{}, ErrNotFound
}

func (m *memRepo) CountActive(_ context.Context, userID, jobType string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, j := range m.rows {
		if j.UserID == userID && j.Type == jobType && !j.Status.Terminal() {
			n++
		}
	}
	return n, nil
}

func (m *memRepo) Claim(context.Context, string, int, time.Duration) ([]Job, error) { return nil, nil }

func (m *memRepo) ByProviderTask(_ context.Context, taskID string) (Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, j := range m.rows {
		if j.ProviderTaskID == taskID {
			return j, nil
		}
	}
	return Job{}, ErrNotFound
}

func (m *memRepo) Advance(_ context.Context, id string, u Update) (Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, j := range m.rows {
		if j.ID != id {
			continue
		}
		if j.Status.Terminal() {
			return Job{}, fmt.Errorf("%w: already %s", ErrInvalidTransition, j.Status)
		}
		if u.Status != "" && u.Status != j.Status {
			if err := ValidateTransition(j.Status, u.Status); err != nil {
				return Job{}, err
			}
			m.rows[i].Status = u.Status
		}
		if u.ProviderTaskID != nil {
			m.rows[i].ProviderTaskID = *u.ProviderTaskID
		}
		return m.rows[i], nil
	}
	return Job{}, ErrNotFound
}

type recordingPublisher struct {
	mu     sync.Mutex
	events map[string][]realtime.Event
}

func (p *recordingPublisher) Publish(userID string, e realtime.Event) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.events == nil {
		p.events = map[string][]realtime.Event{}
	}
	p.events[userID] = append(p.events[userID], e)
}

func TestServiceCreateAndAdvancePublishToOwnerOnly(t *testing.T) {
	pub := &recordingPublisher{}
	svc := NewService(&memRepo{}, pub)
	ctx := context.Background()

	job, isNew, err := svc.Create(ctx, "alice", "discover", nil, "")
	if err != nil || !isNew {
		t.Fatalf("create: %v new=%v", err, isNew)
	}
	if _, err := svc.Advance(ctx, job.ID, Update{Status: StatusRunning}); err != nil {
		t.Fatal(err)
	}

	got := pub.events["alice"]
	if len(got) != 2 || got[0].Type != EventCreated || got[1].Type != EventUpdated || got[1].ResourceID != job.ID {
		t.Fatalf("unexpected events %+v", got)
	}
	if len(pub.events["bob"]) != 0 {
		t.Fatal("events leaked to another user")
	}
}

func TestServiceIdempotentCreateReturnsOriginalWithoutSecondEvent(t *testing.T) {
	pub := &recordingPublisher{}
	svc := NewService(&memRepo{}, pub)
	ctx := context.Background()

	first, isNew, _ := svc.Create(ctx, "alice", "t", nil, "key-1")
	again, isNewAgain, err := svc.Create(ctx, "alice", "t", nil, "key-1")
	if err != nil || !isNew || isNewAgain || again.ID != first.ID {
		t.Fatalf("expected the original job back: %+v %v new=%v", again, err, isNewAgain)
	}
	if n := len(pub.events["alice"]); n != 1 {
		t.Fatalf("a repeat must not publish again, got %d events", n)
	}
	other, isNew, _ := svc.Create(ctx, "bob", "t", nil, "key-1")
	if !isNew || other.ID == first.ID {
		t.Fatal("idempotency keys are scoped per user")
	}
}

func TestServiceRejectsInvalidAndTerminalTransitionsWithoutPublishing(t *testing.T) {
	pub := &recordingPublisher{}
	svc := NewService(&memRepo{}, pub)
	ctx := context.Background()
	job, _, _ := svc.Create(ctx, "alice", "t", nil, "")

	if _, err := svc.Advance(ctx, job.ID, Update{Status: StatusCompleted}); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("queued -> completed must be rejected, got %v", err)
	}
	_, _ = svc.Advance(ctx, job.ID, Update{Status: StatusFailed})
	if _, err := svc.Advance(ctx, job.ID, Update{Status: StatusRunning}); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("a finished job must not move again, got %v", err)
	}
	if n := len(pub.events["alice"]); n != 2 { // created + failed
		t.Fatalf("rejected updates must not publish, got %d events", n)
	}
}

func TestServiceWorksWithoutPublisher(t *testing.T) {
	if _, _, err := NewService(&memRepo{}, nil).Create(context.Background(), "alice", "t", nil, ""); err != nil {
		t.Fatal(err)
	}
}

func TestServiceListPagination(t *testing.T) {
	svc := NewService(&memRepo{}, nil)
	ctx := context.Background()
	for range 5 {
		_, _, _ = svc.Create(ctx, "alice", "t", nil, "")
	}
	_, _, _ = svc.Create(ctx, "bob", "t", nil, "")

	page, err := svc.List(ctx, "alice", 2, 0)
	if err != nil || len(page.Jobs) != 2 || !page.HasMore {
		t.Fatalf("first page: %+v %v", page, err)
	}
	page, _ = svc.List(ctx, "alice", 2, 4)
	if len(page.Jobs) != 1 || page.HasMore {
		t.Fatalf("last page: %+v", page)
	}
}
