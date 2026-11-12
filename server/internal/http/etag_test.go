package httpserver

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRevalidatedSendsThenAnswersNotModified(t *testing.T) {
	h := revalidated(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[1]}`))
	}))

	first := httptest.NewRecorder()
	h.ServeHTTP(first, httptest.NewRequest(http.MethodGet, "/x", nil))
	tag := first.Header().Get("ETag")
	if first.Code != http.StatusOK || tag == "" || first.Header().Get("Cache-Control") != "private, no-cache" {
		t.Fatalf("first = %d tag %q cache %q", first.Code, tag, first.Header().Get("Cache-Control"))
	}

	again := httptest.NewRequest(http.MethodGet, "/x", nil)
	again.Header.Set("If-None-Match", tag)
	second := httptest.NewRecorder()
	h.ServeHTTP(second, again)
	if second.Code != http.StatusNotModified || second.Body.Len() != 0 {
		t.Fatalf("second = %d with %d body bytes, want 304 and none", second.Code, second.Body.Len())
	}
}

func TestRevalidatedLeavesErrorsAlone(t *testing.T) {
	h := revalidated(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	if rec.Code != http.StatusForbidden || rec.Header().Get("ETag") != "" {
		t.Fatalf("got %d etag %q", rec.Code, rec.Header().Get("ETag"))
	}
}

func TestSharedMarksPublicReadsCacheable(t *testing.T) {
	h := shared(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[]}`))
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	if got := rec.Header().Get("Cache-Control"); got != "public, max-age=60, stale-while-revalidate=300" || rec.Header().Get("ETag") == "" {
		t.Fatalf("cache %q etag %q", got, rec.Header().Get("ETag"))
	}
}
