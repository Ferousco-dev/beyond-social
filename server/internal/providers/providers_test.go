package providers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

func server(t *testing.T, status int, body string, wantAuth string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := r.Header.Get("Authorization") + r.Header.Get("X-Api-Key") + r.Header.Get("x-goog-api-key")
		if got != wantAuth {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
}

func TestVerifyAcceptsAndRejectsKeys(t *testing.T) {
	srv := server(t, 200, `{"data":{}}`, "Bearer good")
	defer srv.Close()
	c := NewChecker()
	c.ApifyBase = srv.URL
	if err := c.Verify(context.Background(), secrets.NameApify, "good"); err != nil {
		t.Fatal(err)
	}
	err := c.Verify(context.Background(), secrets.NameApify, "bad-secret-key")
	if err == nil || strings.Contains(err.Error(), "bad-secret-key") {
		t.Fatalf("err = %v (must be set and never echo the key)", err)
	}
}

func TestKIEFailureInBodyIsRejected(t *testing.T) {
	srv := server(t, 200, `{"code":401,"msg":"bad key"}`, "Bearer k")
	defer srv.Close()
	c := NewChecker()
	c.KIEBase = srv.URL
	if err := c.Verify(context.Background(), secrets.NameKIE, "k"); err == nil {
		t.Fatal("a 200 response carrying code 401 must be rejected")
	}
}

func TestBalances(t *testing.T) {
	kie := server(t, 200, `{"code":200,"msg":"ok","data":420}`, "Bearer k")
	hey := server(t, 200, `{"data":{"wallet":{"remaining_balance":12.5}}}`, "h")
	api := server(t, 200, `{"data":{"limits":{"maxMonthlyUsageUsd":10},"current":{"monthlyUsageUsd":3.5}}}`, "Bearer a")
	defer kie.Close()
	defer hey.Close()
	defer api.Close()
	c := NewChecker()
	c.KIEBase, c.HeygenBase, c.ApifyBase = kie.URL, hey.URL, api.URL
	ctx := context.Background()
	for name, want := range map[string]struct {
		key    string
		amount float64
		unit   string
	}{
		secrets.NameKIE:    {"k", 420, "credits"},
		secrets.NameHeygen: {"h", 12.5, "usd"},
		secrets.NameApify:  {"a", 6.5, "usd"},
	} {
		b, err := c.Balance(ctx, name, want.key)
		if err != nil || b.Amount != want.amount || b.Unit != want.unit {
			t.Fatalf("%s: %+v %v", name, b, err)
		}
	}
	if _, err := c.Balance(ctx, secrets.NameGemini, "x"); err != ErrNoBalance {
		t.Fatalf("gemini err = %v", err)
	}
}
