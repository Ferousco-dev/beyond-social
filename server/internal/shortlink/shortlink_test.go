package shortlink

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestOnlyShareSheetAddressesAreShort(t *testing.T) {
	for raw, want := range map[string]bool{
		"https://vm.tiktok.com/ZMabc123/":                  true,
		"https://vt.tiktok.com/ZSabc123/":                  true,
		"https://www.tiktok.com/t/ZTabc123/":               true,
		"https://instagr.am/p/Cabc123/":                    true,
		"https://www.instagram.com/share/reel/BAbc123/":    true,
		"https://www.tiktok.com/@someone/video/7300000000": false,
		"https://www.instagram.com/reel/Cabc123/":          false,
		"http://vm.tiktok.com/ZMabc123/":                   false,
		"https://vm.tiktok.com.evil.example/ZMabc123/":     false,
		"https://evil.example/t/abc":                       false,
		"https://vm.tiktok.com/":                           false,
	} {
		if got := IsShort(raw); got != want {
			t.Errorf("IsShort(%q) = %v, want %v", raw, got, want)
		}
	}
}

// serve answers each path with the redirect it is given, and returns a resolver
// that may also visit the test server, plus the server's address.
func serve(t *testing.T, redirects map[string]string) (*Resolver, string) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if to, ok := redirects[r.URL.Path]; ok {
			w.Header().Set("Location", to)
			w.WriteHeader(http.StatusFound)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(srv.Close)
	client := srv.Client()
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	base, _ := url.Parse(srv.URL)
	return &Resolver{client: client, valid: func(u *url.URL) bool { return u.Host == base.Host || (u.Scheme == "https" && onPlatform(u.Hostname())) }}, srv.URL
}

func TestAShortLinkLeadsToTheCanonicalPostWithoutTracking(t *testing.T) {
	r, base := serve(t, map[string]string{
		"/a": "/b",
		"/b": "https://www.tiktok.com/@someone/video/7300000000?is_from_webapp=1&sender_device=pc",
	})
	got, err := r.Resolve(context.Background(), base+"/a")
	if err != nil || got != "https://www.tiktok.com/@someone/video/7300000000" {
		t.Fatalf("got %q err %v", got, err)
	}
}

func TestAnInstagramShareLinkLeadsToTheReel(t *testing.T) {
	r, base := serve(t, map[string]string{"/share": "https://www.instagram.com/reel/Cabc123/?igsh=xyz"})
	got, err := r.Resolve(context.Background(), base+"/share")
	if err != nil || got != "https://www.instagram.com/reel/Cabc123/" {
		t.Fatalf("got %q err %v", got, err)
	}
}

func TestARedirectToAnotherSiteIsRefused(t *testing.T) {
	r, base := serve(t, map[string]string{"/a": "https://evil.example/steal"})
	if _, err := r.Resolve(context.Background(), base+"/a"); err == nil {
		t.Fatal("followed a link off the platform")
	}
	r, base = serve(t, map[string]string{"/a": "http://www.tiktok.com/@u/video/1"})
	if _, err := r.Resolve(context.Background(), base+"/a"); err == nil {
		t.Fatal("followed a downgrade to http")
	}
}

func TestALoopOrADeadEndGivesUp(t *testing.T) {
	r, base := serve(t, map[string]string{"/a": "/b", "/b": "/a"})
	if _, err := r.Resolve(context.Background(), base+"/a"); err == nil {
		t.Fatal("a redirect loop did not end")
	}
	if _, err := r.Resolve(context.Background(), base+"/nothing"); err == nil {
		t.Fatal("a page with no redirect was treated as a post")
	}
}

func TestAnAddressOffThePlatformIsNeverRequested(t *testing.T) {
	r := NewResolver()
	if _, err := r.Resolve(context.Background(), "https://evil.example/t/abc"); err == nil {
		t.Fatal("resolved an address off the platform")
	}
}
