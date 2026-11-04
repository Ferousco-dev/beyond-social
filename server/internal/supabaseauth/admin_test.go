package supabaseauth

import (
	"context"
	"net/http"
	"net/http/httptest"
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
