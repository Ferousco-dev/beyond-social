package avatars

import (
	"context"
	"errors"
	"testing"
)

type fakeBiller struct {
	reserveErr error
	reserved   []string
	closed     map[string]bool
}

func (f *fakeBiller) Reserve(_ context.Context, _, id string) error {
	if f.reserveErr != nil {
		return f.reserveErr
	}
	f.reserved = append(f.reserved, id)
	return nil
}

func (f *fakeBiller) Close(_ context.Context, _, id string, delivered bool) error {
	if f.closed == nil {
		f.closed = map[string]bool{}
	}
	f.closed[id] = delivered
	return nil
}

func TestTrainingIsChargedAndClosedWhenFinal(t *testing.T) {
	for _, tc := range []struct {
		name      string
		status    string
		delivered bool
	}{{"ready", trainingReady, true}, {"failed", trainingFailed, false}} {
		t.Run(tc.name, func(t *testing.T) {
			r := newRig()
			b := &fakeBiller{}
			r.svc.WithBiller(b)
			a := r.register(t)
			if len(b.reserved) != 1 || b.reserved[0] != a.ID {
				t.Fatalf("reserved = %v", b.reserved)
			}
			if _, err := r.svc.advance(ctx, a.ID, Update{TrainingStatus: tc.status}); err != nil {
				t.Fatal(err)
			}
			if got, ok := b.closed[a.ID]; !ok || got != tc.delivered {
				t.Fatalf("closed = %v, want delivered=%v", b.closed, tc.delivered)
			}
		})
	}
}

func TestUnfundedRegistrationIsRefusedAndNotLeftPending(t *testing.T) {
	r := newRig()
	r.svc.WithBiller(&fakeBiller{reserveErr: errors.New("not enough credits")})
	if _, _, err := r.svc.Register(ctx, alice, goodInput()); err == nil {
		t.Fatal("registration without credits must be refused")
	}
	if n, _ := r.repo.CountPending(ctx, alice); n != 0 {
		t.Fatalf("pending = %d, want 0", n)
	}
}
