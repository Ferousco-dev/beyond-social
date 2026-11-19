package supabaseauth

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRemoveUserUsesTheServiceKeyAndTreatsAGoneUserAsRemoved(t *testing.T) {
	var method, path, auth string
	status := http.StatusOK
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		method, path, auth = r.Method, r.URL.Path, r.Header.Get("Authorization")
		w.WriteHeader(status)
	}))
	defer server.Close()
	admin := NewAdmin(server.URL, "service-key")

	if err := admin.RemoveUser(context.Background(), "u1"); err != nil || method != http.MethodDelete || path != "/auth/v1/admin/users/u1" || auth != "Bearer service-key" {
		t.Fatalf("%s %s %q err %v", method, path, auth, err)
	}
	status = http.StatusNotFound
	if err := admin.RemoveUser(context.Background(), "u1"); err != nil {
		t.Fatalf("a user that is already gone: %v", err)
	}
	status = http.StatusInternalServerError
	if err := admin.RemoveUser(context.Background(), "u1"); err == nil {
		t.Fatal("a failure was reported as success")
	}
}

func TestRecoveryTokenAsksForARecoveryLinkAndReadsTheToken(t *testing.T) {
	var path, auth, body string
	status, reply := http.StatusOK, `{"hashed_token":"abc123","action_link":"https://x"}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path, auth = r.URL.Path, r.Header.Get("Authorization")
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		w.WriteHeader(status)
		_, _ = w.Write([]byte(reply))
	}))
	defer server.Close()
	admin := NewAdmin(server.URL, "service-key")

	token, ok, err := admin.RecoveryToken(context.Background(), "a@example.com")
	if err != nil || !ok || token != "abc123" || path != "/auth/v1/admin/generate_link" || auth != "Bearer service-key" ||
		!strings.Contains(body, `"type":"recovery"`) || !strings.Contains(body, `"email":"a@example.com"`) {
		t.Fatalf("token=%q ok=%v err=%v path=%s auth=%s body=%s", token, ok, err, path, auth, body)
	}
	status, reply = http.StatusNotFound, `{}`
	if _, ok, err := admin.RecoveryToken(context.Background(), "nobody@example.com"); ok || err != nil {
		t.Fatalf("unknown address: ok=%v err=%v", ok, err)
	}
	status, reply = http.StatusInternalServerError, `{}`
	if _, _, err := admin.RecoveryToken(context.Background(), "a@example.com"); err == nil {
		t.Fatal("a server failure was reported as success")
	}
}
