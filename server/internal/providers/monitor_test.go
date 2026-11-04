package providers

import (
	"context"
	"sync"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

type recorder struct {
	mu   sync.Mutex
	errs []error
}

func (r *recorder) Report(_ context.Context, err error, _ alerts.Context) provider.Class {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.errs = append(r.errs, err)
	return provider.Classify(err)
}

func TestMonitorAlertsOnlyBelowThreshold(t *testing.T) {
	kie := server(t, 200, `{"code":200,"msg":"ok","data":120}`, "Bearer k")
	defer kie.Close()
	c := NewChecker()
	c.KIEBase = kie.URL
	rec := &recorder{}
	m := &Monitor{
		Checker: c, Alerts: rec,
		Key: func(name string) provider.KeyFunc {
			if name == secrets.NameKIE {
				return provider.StaticKey("k")
			}
			return func(context.Context) (string, error) { return "", provider.ErrNotConfigured(name) }
		},
		Threshold: func(context.Context, string) (int, bool, error) { return 500, true, nil },
	}
	if got := m.Once(context.Background()); len(got) != 1 || got[0].Amount != 120 {
		t.Fatalf("balances = %+v", got)
	}
	if len(rec.errs) != 1 || provider.Classify(rec.errs[0]) != provider.ClassQuota {
		t.Fatalf("alerts = %v", rec.errs)
	}

	m.Threshold = func(context.Context, string) (int, bool, error) { return 100, true, nil }
	m.Once(context.Background())
	if len(rec.errs) != 1 {
		t.Fatal("a healthy balance must not alert")
	}
}
