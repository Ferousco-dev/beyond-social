package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

type fakeSpend struct{ days int }

func (f *fakeSpend) Report(_ context.Context, days int) (credits.SpendReport, error) {
	f.days = days
	return credits.SpendReport{Days: days, Users: []credits.UserSpend{{Email: "heavy@example.com", Jobs: 3, CostUSD: 4.2}}}, nil
}

func TestAdminSpendIsAdminOnlyAndBoundsTheWindow(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	spend := &fakeSpend{}
	h.deps.Spend = spend
	h.rebuild()
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}
	user, adm := h.token(t, alice), h.token(t, bob)

	if res := send(h, http.MethodGet, "/api/v1/admin/spend", user, ""); res.Code != http.StatusNotFound || strings.Contains(res.Body.String(), "heavy@example.com") {
		t.Fatalf("a normal user must not reach spend or see emails: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/spend", "", ""); res.Code == http.StatusOK {
		t.Fatalf("anonymous callers must be refused: %d", res.Code)
	}
	res := send(h, http.MethodGet, "/api/v1/admin/spend", adm, "")
	if res.Code != http.StatusOK || spend.days != 30 || !strings.Contains(res.Body.String(), "heavy@example.com") {
		t.Fatalf("admin default window: %d days=%d %s", res.Code, spend.days, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/spend?days=365", adm, ""); res.Code != http.StatusBadRequest {
		t.Fatalf("an unbounded window must be refused: %d", res.Code)
	}
}
