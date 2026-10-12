// Package analysis lets Gemini watch a video someone linked to and describe how
// it is made, so a new video can be built from the same ideas.
package analysis

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

// Kind says how a link is turned into something Gemini can watch.
type Kind string

const (
	KindTikTok    Kind = "tiktok"
	KindInstagram Kind = "instagram"
	// KindYouTube links are handed to Gemini directly. It fetches public ones itself.
	KindYouTube Kind = "youtube"
)

// Link is a supported video link, cleaned of tracking parameters.
type Link struct {
	Kind Kind
	URL  string
}

var urlPattern = regexp.MustCompile(`https://[^\s<>"')\]]+`)

var youtubeID = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)

// ParseLink recognises one TikTok, Instagram or YouTube video link.
func ParseLink(raw string) (Link, bool) {
	if platform, clean, err := video.ParsePageURL(raw); err == nil {
		return Link{Kind: Kind(platform), URL: clean}, true
	}
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme != "https" || u.User != nil {
		return Link{}, false
	}
	host := strings.ToLower(u.Hostname())
	var id string
	switch {
	case host == "youtu.be":
		id = strings.Trim(u.EscapedPath(), "/")
	case host == "youtube.com" || host == "www.youtube.com" || host == "m.youtube.com":
		switch path := strings.TrimRight(u.EscapedPath(), "/"); {
		case path == "/watch":
			id = u.Query().Get("v")
		case strings.HasPrefix(path, "/shorts/"):
			id = strings.TrimPrefix(path, "/shorts/")
		}
	}
	if !youtubeID.MatchString(id) {
		return Link{}, false
	}
	return Link{Kind: KindYouTube, URL: "https://www.youtube.com/watch?v=" + id}, true
}

// FindLink returns the first supported video link in free text and the text
// with that link taken out, which is what the person wants done with it.
func FindLink(text string) (Link, string, bool) {
	for _, candidate := range urlPattern.FindAllString(text, -1) {
		trimmed := strings.TrimRight(candidate, ".,;:!?")
		if link, ok := ParseLink(trimmed); ok {
			rest := strings.TrimSpace(strings.Replace(text, candidate, "", 1))
			return link, rest, true
		}
	}
	return Link{}, "", false
}
