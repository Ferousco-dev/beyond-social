package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
)

type fakeAlertStore struct{ rows []alerts.Alert }

func (f *fakeAlertStore) Record(_ context.Context, a alerts.Alert) (alerts.Alert, bool, error) {
	a.ID = "40000000-0000-4000-8000-000000000001"
	f.rows = append(f.rows, a)
	return a, true, nil
}
func (f *fakeAlertStore) List(context.Context, bool, int) ([]alerts.Alert, error) { return f.rows, nil }
func (f *fakeAlertStore) Resolve(_ context.Context, id string) (bool, error) {
	return id == "40000000-0000-4000-8000-000000000001", nil
}

func TestAdminAlertsAreForAdminsOnly(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	store := &fakeAlertStore{rows: []alerts.Alert{{ID: "x", Kind: "quota", Provider: "gemini", Message: "out of credit"}}}
	h.deps.Alerts = alerts.NewService(store, nil)
	h.rebuild()
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}

	if res := h.get("/api/v1/admin/alerts", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := h.get("/api/v1/admin/alerts", h.token(t, alice)); res.Code != http.StatusNotFound {
		t.Fatalf("a normal user must not learn the route exists: %d", res.Code)
	}
	res := h.get("/api/v1/admin/alerts", h.token(t, bob))
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "out of credit") {
		t.Fatalf("admin list: %d %s", res.Code, res.Body)
	}

	resolve := func(token, id string) int {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/alerts/"+id+"/resolve", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		h.handler.ServeHTTP(w, req)
		return w.Code
	}
	if code := resolve(h.token(t, alice), "40000000-0000-4000-8000-000000000001"); code != http.StatusNotFound {
		t.Fatalf("non-admin resolve: %d", code)
	}
	if code := resolve(h.token(t, bob), "40000000-0000-4000-8000-000000000001"); code != http.StatusNoContent {
		t.Fatalf("admin resolve: %d", code)
	}
	if code := resolve(h.token(t, bob), "40000000-0000-4000-8000-0000000000ff"); code != http.StatusNotFound {
		t.Fatalf("unknown alert: %d", code)
	}
	if code := resolve(h.token(t, bob), "nope"); code != http.StatusBadRequest {
		t.Fatalf("malformed id: %d", code)
	}
}
