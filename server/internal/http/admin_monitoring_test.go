package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/monitoring"
)

type fakeAdminMonitoring struct{ snapshot monitoring.Snapshot }

func (f fakeAdminMonitoring) Snapshot(context.Context) (monitoring.Snapshot, error) {
	return f.snapshot, nil
}

func TestAdminMonitoringIsRestrictedAndReturnsSnapshot(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.profiles.rows[alice] = accounts.Profile{ID: alice, Role: accounts.RoleAdmin}
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleUser}
	h.deps.Monitoring = fakeAdminMonitoring{snapshot: monitoring.Snapshot{
		Jobs:    monitoring.JobCounts{Queued: 2, Failed: 1},
		Storage: monitoring.StorageUsage{MediaObjects: 3, MediaBytes: 4096},
	}}
	h.rebuild()

	if res := h.get("/api/v1/admin/monitoring", h.token(t, alice)); res.Code != http.StatusOK ||
		!strings.Contains(res.Body.String(), `"queued":2`) || !strings.Contains(res.Body.String(), `"mediaBytes":4096`) {
		t.Fatalf("admin snapshot: %d %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/admin/monitoring", h.token(t, bob)); res.Code != http.StatusNotFound {
		t.Fatalf("non-admin snapshot: %d %s", res.Code, res.Body)
	}
}
