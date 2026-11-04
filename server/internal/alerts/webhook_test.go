package alerts

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func TestPostTextSendsWhatSlackAndDiscordBothRead(t *testing.T) {
	var got map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &got)
	}))
	defer server.Close()
	if err := PostText(context.Background(), server.Client(), server.URL, "hello"); err != nil || got["text"] != "hello" || got["content"] != "hello" {
		t.Fatalf("err=%v body=%v", err, got)
	}
	refusing := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusBadRequest) }))
	defer refusing.Close()
	if err := PostText(context.Background(), refusing.Client(), refusing.URL, "x"); err == nil {
		t.Fatal("a refused post was reported as sent")
	}
}

func TestAnUnsetWebhookIsNotAnErrorAndAPrivateOneIsRefused(t *testing.T) {
	unset := NewWebhook(func(context.Context) (string, error) { return "", provider.ErrNotConfigured("alert_webhook") })
	if err := unset.Send(context.Background(), Alert{Kind: "quota", Message: "low", Count: 1}); err != nil {
		t.Fatalf("an unset webhook failed the alert: %v", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer server.Close()
	private := NewWebhook(provider.StaticKey(strings.Replace(server.URL, "http://", "https://", 1)))
	if err := private.Post(context.Background(), "x"); err == nil {
		t.Fatal("a webhook on a private address was called")
	}
}
