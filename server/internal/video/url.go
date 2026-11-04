package video

import (
	"errors"
	"net/url"
	"strings"
)

// ErrNoVideoFile means a post has no downloadable video file (a photo post, or a
// removed one).
var ErrNoVideoFile = errors.New("no downloadable video file for this post")

var ErrUnsupportedURL = errors.New("not a supported TikTok or Instagram video URL")

// ParsePageURL recognises a public TikTok or Instagram video page and returns
// its platform and a normalised https URL with no query string or fragment.
func ParsePageURL(raw string) (Platform, string, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme != "https" || u.User != nil {
		return "", "", ErrUnsupportedURL
	}
	host := strings.ToLower(u.Hostname())
	path := strings.TrimRight(u.EscapedPath(), "/")
	switch {
	case hostIs(host, "tiktok.com"):
		// /@user/video/123, or a vm./vt. short link carrying a single path segment.
		if strings.Contains(path, "/video/") || (path != "" && strings.Count(path, "/") == 1 && (strings.HasPrefix(host, "vm.") || strings.HasPrefix(host, "vt."))) {
			return TikTok, "https://" + host + path, nil
		}
	case hostIs(host, "instagram.com"):
		if strings.HasPrefix(path, "/reel/") || strings.HasPrefix(path, "/reels/") || strings.HasPrefix(path, "/p/") || strings.HasPrefix(path, "/tv/") {
			return Instagram, "https://" + host + path + "/", nil
		}
	}
	return "", "", ErrUnsupportedURL
}

// IsPlatformHost reports whether rawURL is https on the platform's own domain.
func IsPlatformHost(p Platform, rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil || u.Scheme != "https" {
		return false
	}
	switch p {
	case TikTok:
		return hostIs(strings.ToLower(u.Hostname()), "tiktok.com")
	case Instagram:
		return hostIs(strings.ToLower(u.Hostname()), "instagram.com")
	}
	return false
}

func hostIs(host, domain string) bool {
	return host == domain || strings.HasSuffix(host, "."+domain)
}
