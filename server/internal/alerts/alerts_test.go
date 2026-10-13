package alerts

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type memStore struct {
	records []Alert
	notify  bool
}

func (m *memStore) Record(_ context.Context, a Alert) (Alert, bool, error) {
	m.records = append(m.records, a)
	a.Count = len(m.records)
	return a, m.notify, nil
}
func (m *memStore) List(context.Context, bool, int) ([]Alert, error) { return m.records, nil }
func (m *memStore) Resolve(context.Context, string) (bool, error)    { return true, nil }

type memSender struct {
	sent []Alert
	err  error
}

func (m *memSender) Send(_ context.Context, a Alert) error {
	m.sent = append(m.sent, a)
	return m.err
}

var ctx = context.Background()

func TestOnlyOperatorProblemsRaiseAlerts(t *testing.T) {
	store, sender := &memStore{notify: true}, &memSender{}
	s := NewService(store, sender)

	for name, tc := range map[string]struct {
		err   error
		class provider.Class
		alert bool
	}{
		"no credit":      {&provider.Error{Provider: "gemini", Status: 429, Code: "RESOURCE_EXHAUSTED", Message: "quota exceeded", Transient: true}, provider.ClassQuota, true},
		"payment":        {&provider.Error{Provider: "kie", Status: 402}, provider.ClassQuota, true},
		"bad key":        {&provider.Error{Provider: "heygen", Status: 401}, provider.ClassAuth, true},
		"outage":         {&provider.Error{Provider: "apify", Status: 503, Transient: true}, provider.ClassTransient, false},
		"rejected input": {&provider.Error{Provider: "heygen", Status: 400}, provider.ClassRejected, false},
		"not a provider": {errors.New("db down"), provider.ClassUnknown, false},
	} {
		before := len(store.records)
		if got := s.Report(ctx, tc.err, Context{Source: "test", UserID: "u1", Resource: "r1"}); got != tc.class {
			t.Errorf("%s: class %q want %q", name, got, tc.class)
		}
		if raised := len(store.records) > before; raised != tc.alert {
			t.Errorf("%s: alert raised=%v want %v", name, raised, tc.alert)
		}
	}
	if len(sender.sent) != 3 {
		t.Fatalf("expected 3 deliveries, got %d", len(sender.sent))
	}
	for _, got := range sender.sent {
		if got.UserID != "u1" || got.Resource != "r1" || (got.Kind != "quota" && got.Kind != "auth") {
			t.Fatalf("unexpected alert %+v", got)
		}
	}
}

func TestRepeatsDoNotRenotifyAndDeliveryFailureIsHarmless(t *testing.T) {
	store, sender := &memStore{notify: false}, &memSender{err: errors.New("webhook down")}
	s := NewService(store, sender)
	quota := &provider.Error{Provider: "gemini", Status: 402}

	s.Report(ctx, quota, Context{Source: "t"})
	if len(sender.sent) != 0 {
		t.Fatal("the store said it was a repeat, so nobody should be pinged again")
	}
	store.notify = true
	if got := s.Report(ctx, quota, Context{Source: "t"}); got != provider.ClassQuota || len(sender.sent) != 1 {
		t.Fatalf("a failing webhook must not change the outcome: class=%q sent=%d", got, len(sender.sent))
	}
}

func TestNilServiceAndReporterAreSafe(t *testing.T) {
	var s *Service
	if got := s.Report(ctx, &provider.Error{Status: 402}, Context{}); got != provider.ClassQuota {
		t.Fatalf("a nil service still classifies: %q", got)
	}
	if got := Report(ctx, nil, &provider.Error{Status: 401}, Context{}); got != provider.ClassAuth {
		t.Fatalf("a nil reporter still classifies: %q", got)
	}
}
