// Package shortlink turns the shortened addresses people paste from share sheets
// (vm.tiktok.com, tiktok.com/t/..., instagram.com/share/...) into the post's real
// address. A short link is a redirect, so resolving one means making a request to
// an address a stranger chose. That is only done for the share hosts named here,
// each hop must stay on TikTok or Instagram over https, and nothing but the
// Location header is read.
package shortlink

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

const (
	maxHops = 4
	timeout = 8 * time.Second
)

// ErrNotResolved means the link did not lead to a post we can use.
var ErrNotResolved = errors.New("that link could not be resolved to a post")

// IsShort reports whether raw is one of the share-sheet addresses worth resolving.
func IsShort(raw string) bool {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme != "https" || u.User != nil {
		return false
	}
	host, path := strings.ToLower(u.Hostname()), u.EscapedPath()
	switch {
	case host == "vm.tiktok.com" || host == "vt.tiktok.com" || host == "instagr.am":
		return strings.Trim(path, "/") != ""
	case host == "m.tiktok.com" || host == "tiktok.com" || host == "www.tiktok.com":
		return strings.HasPrefix(path, "/t/")
	case host == "m.instagram.com" || host == "instagram.com" || host == "www.instagram.com":
		return strings.HasPrefix(path, "/share/")
	}
	return false
}

// onPlatform keeps every hop on the platforms' own domains.
func onPlatform(host string) bool {
	host = strings.ToLower(host)
	for _, domain := range []string{"tiktok.com", "instagram.com", "instagr.am"} {
		if host == domain || strings.HasSuffix(host, "."+domain) {
			return true
		}
	}
	return false
}

type Resolver struct {
	client *http.Client
	// valid decides whether a hop may be followed. Tests loosen it; production does not.
	valid func(*url.URL) bool
}

// NewResolver uses the address guard's client, so a link can never lead into
// private space, and follows redirects by hand so each hop can be checked.
func NewResolver() *Resolver {
	guarded := *safenet.NewClient(timeout)
	guarded.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return &Resolver{client: &guarded, valid: func(u *url.URL) bool { return u.Scheme == "https" && u.User == nil && onPlatform(u.Hostname()) }}
}

// Resolve follows a short link to the post's canonical address.
func (r *Resolver) Resolve(ctx context.Context, raw string) (string, error) {
	current, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || !r.valid(current) {
		return "", ErrNotResolved
	}
	for hop := 0; hop < maxHops; hop++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, current.String(), nil)
		if err != nil {
			return "", ErrNotResolved
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; BeyondSocial/1.0)")
		resp, err := r.client.Do(req)
		if err != nil {
			return "", ErrNotResolved
		}
		location := resp.Header.Get("Location")
		resp.Body.Close() // only the headers matter
		if resp.StatusCode < 300 || resp.StatusCode > 399 || location == "" {
			return "", ErrNotResolved
		}
		next, err := current.Parse(location)
		if err != nil || !r.valid(next) {
			return "", ErrNotResolved
		}
		if _, canonical, err := video.ParsePageURL(next.String()); err == nil && !IsShort(canonical) {
			return canonical, nil
		}
		current = next
	}
	return "", ErrNotResolved
}
