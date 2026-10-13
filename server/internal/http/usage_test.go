package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

type fakeUsage struct {
	plan    credits.Plan
	enabled bool
	cap     int
}

func (f *fakeUsage) Usage(context.Context, string) (credits.Snapshot, error) {
	reset := time.Date(2026, 10, 14, 15, 0, 0, 0, time.UTC)
	return credits.Snapshot{Plan: f.plan, FiveUsed: 12, FiveLimit: 40, FiveResetsAt: &reset, WeekUsed: 30, WeekLimit: 120, WeekResetsAt: reset, OverageEnabled: f.enabled, OverageCap: f.cap}, nil
}
func (f *fakeUsage) SetOverage(_ context.Context, _ string, enabled bool, limit int) error {
	f.enabled, f.cap = enabled, limit
	return nil
}
func (f *fakeUsage) Info(context.Context) (credits.PlanInfo, error) {
	return credits.PlanInfo{ProPriceCents: 2000, FreeCredits: 300, FreeAvatars: 1}, nil
}
func (f *fakeUsage) PlanOf(context.Context, string) (credits.Plan, error) { return f.plan, nil }

func TestUsageEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	usage := &fakeUsage{plan: credits.PlanPro}
	h.deps.Usage, h.deps.Credits = usage, fakeBalance{}
	h.rebuild()
	a := h.token(t, alice)

	if res := send(h, http.MethodGet, "/api/v1/usage", "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/usage", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"five_hour_limit":40`) || !strings.Contains(res.Body.String(), `"plan":"pro"`) {
		t.Fatalf("usage: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, "/api/v1/usage/overage", a, `{"enabled":true,"cap":300}`); res.Code != http.StatusNoContent || !usage.enabled || usage.cap != 300 {
		t.Fatalf("overage on: %d %+v", res.Code, usage)
	}
	if res := send(h, http.MethodPut, "/api/v1/usage/overage", a, `{"enabled":true,"cap":-1}`); res.Code != http.StatusBadRequest {
		t.Fatalf("negative cap: %d", res.Code)
	}
	usage.plan = credits.PlanFree
	if res := send(h, http.MethodPut, "/api/v1/usage/overage", a, `{"enabled":true,"cap":10}`); res.Code != http.StatusForbidden {
		t.Fatalf("a free user turned on extra usage: %d", res.Code)
	}
}

func TestALimitIsReportedWithItsResetTime(t *testing.T) {
	reset := time.Now().Add(2 * time.Hour)
	rec := httptest.NewRecorder()
	if !writeCreditError(rec, &credits.LimitError{Window: credits.WindowFiveHour, ResetsAt: reset}) {
		t.Fatal("a usage limit was not recognised")
	}
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("status %d retry-after %q", rec.Code, rec.Header().Get("Retry-After"))
	}
	body := rec.Body.String()
	for _, want := range []string{`"code":"usage_limit"`, `five hour usage limit`, `"resets_at"`, "extra usage"} {
		if !strings.Contains(body, want) {
			t.Errorf("body lacks %s: %s", want, body)
		}
	}
}
