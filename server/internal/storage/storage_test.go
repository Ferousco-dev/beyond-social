package storage

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func newClient(t *testing.T, h http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return NewClient(srv.URL, "service-key")
}

func TestSignedURL(t *testing.T) {
	c := newClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/storage/v1/object/sign/avatar-footage/u1/twin-1.mp4" ||
			r.Header.Get("Authorization") != "Bearer service-key" {
			t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"signedURL":"/object/sign/avatar-footage/u1/twin-1.mp4?token=abc"}`))
	})
	u, err := c.SignedURL(context.Background(), "avatar-footage", "u1/twin-1.mp4", time.Hour)
	if err != nil || !strings.HasSuffix(u, "/storage/v1/object/sign/avatar-footage/u1/twin-1.mp4?token=abc") {
		t.Fatalf("%q %v", u, err)
	}
}

func TestPathsAreValidatedBeforeAnyRequest(t *testing.T) {
	c := newClient(t, func(http.ResponseWriter, *http.Request) { t.Error("no request should be made for a bad path") })
	for _, p := range []string{"", "../etc/passwd", "a/../b", "/abs", "a//b", "a/b/", "a b", "a?x=1", "a%2e%2e/b", "..", "a/./b"} {
		if _, err := c.SignedURL(context.Background(), "avatar-footage", p, time.Minute); !errors.Is(err, ErrBadPath) {
			t.Errorf("%q: expected ErrBadPath, got %v", p, err)
		}
	}
	if err := c.Delete(context.Background(), "../x", "a/b.mp4"); !errors.Is(err, ErrBadPath) {
		t.Errorf("bad bucket should be rejected, got %v", err)
	}
}

func TestStat(t *testing.T) {
	c := newClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodHead {
			t.Errorf("stat must use HEAD, got %s", r.Method)
		}
		if strings.HasSuffix(r.URL.Path, "missing.mp4") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "Video/MP4; codecs=x")
		w.Header().Set("Content-Length", "12345")
	})
	info, err := c.Stat(context.Background(), "avatar-footage", "u1/ok.mp4")
	if err != nil || info.Size != 12345 || info.ContentType != "video/mp4" {
		t.Fatalf("%+v %v", info, err)
	}
	if _, err := c.Stat(context.Background(), "avatar-footage", "u1/missing.mp4"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestDeleteTreatsMissingAsDone(t *testing.T) {
	status := http.StatusOK
	c := newClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			t.Errorf("got %s", r.Method)
		}
		w.WriteHeader(status)
		_, _ = w.Write([]byte(`{}`))
	})
	if err := c.Delete(context.Background(), "avatar-footage", "u1/a.mp4"); err != nil {
		t.Fatal(err)
	}
	status = http.StatusNotFound
	if err := c.Delete(context.Background(), "avatar-footage", "u1/a.mp4"); err != nil {
		t.Fatalf("an object that is already gone is not an error: %v", err)
	}
	status = http.StatusInternalServerError
	if err := c.Delete(context.Background(), "avatar-footage", "u1/a.mp4"); !provider.IsTransient(err) {
		t.Fatalf("a server error should be transient: %v", err)
	}
}

func TestSignedUploadToken(t *testing.T) {
	for name, body := range map[string]string{
		"token field":  `{"token":"abc"}`,
		"token in url": `{"url":"/object/upload/sign/avatar-footage/u1/a.mp4?token=abc"}`,
	} {
		c := newClient(t, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost || r.URL.Path != "/storage/v1/object/upload/sign/avatar-footage/u1/a.mp4" {
				t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
			}
			_, _ = w.Write([]byte(body))
		})
		if tok, err := c.SignedUploadToken(context.Background(), "avatar-footage", "u1/a.mp4"); err != nil || tok != "abc" {
			t.Errorf("%s: %q %v", name, tok, err)
		}
	}
	c := newClient(t, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{}`)) })
	if _, err := c.SignedUploadToken(context.Background(), "avatar-footage", "u1/a.mp4"); err == nil {
		t.Error("a response without a token must be an error")
	}
	if _, err := c.SignedUploadToken(context.Background(), "avatar-footage", "../x"); !errors.Is(err, ErrBadPath) {
		t.Errorf("bad path: %v", err)
	}
}
