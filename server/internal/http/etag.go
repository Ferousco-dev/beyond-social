package httpserver

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
)

// revalidated wraps a read-only list handler so a caller that already holds the
// current answer is told so instead of being sent it again.
//
// The body is hashed into a strong ETag. A matching If-None-Match gets a bare
// 304, and either way the response is marked private and must-revalidate: it is
// per-user data, so no shared cache may keep it, and a browser may keep it only
// by asking first. Only successful GETs are touched; errors pass through as
// they are.
func revalidated(next http.Handler) http.Handler {
	return tagged(next, "private, no-cache")
}

// shared wraps a public, identical-for-everyone read (the price list, credit
// packs, blog) so browsers and any CDN in front may keep it briefly and serve
// it stale while it refreshes. Never use it on anything that depends on who is
// asking.
func shared(next http.Handler) http.Handler {
	return tagged(next, "public, max-age=60, stale-while-revalidate=300")
}

func tagged(next http.Handler, cacheControl string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			next.ServeHTTP(w, r)
			return
		}
		rec := &bufferedResponse{header: http.Header{}, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		for key, values := range rec.header {
			w.Header()[key] = values
		}
		if rec.status == http.StatusOK {
			sum := sha256.Sum256(rec.body.Bytes())
			tag := `"` + hex.EncodeToString(sum[:16]) + `"`
			w.Header().Set("ETag", tag)
			w.Header().Set("Cache-Control", cacheControl)
			if matchesTag(r.Header.Get("If-None-Match"), tag) {
				w.WriteHeader(http.StatusNotModified)
				return
			}
		}
		w.WriteHeader(rec.status)
		_, _ = w.Write(rec.body.Bytes())
	})
}

func matchesTag(header, tag string) bool {
	for _, candidate := range strings.Split(header, ",") {
		candidate = strings.TrimPrefix(strings.TrimSpace(candidate), "W/")
		if candidate == tag || candidate == "*" {
			return true
		}
	}
	return false
}

type bufferedResponse struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func (b *bufferedResponse) Header() http.Header         { return b.header }
func (b *bufferedResponse) WriteHeader(status int)      { b.status = status }
func (b *bufferedResponse) Write(p []byte) (int, error) { return b.body.Write(p) }
