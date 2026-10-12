package apify

import (
	"regexp"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

// Actors are third-party and get replaced, so the IDs are overridable.
const (
	DefaultTikTokActor    = "clockworks/tiktok-scraper"
	DefaultInstagramActor = "apify/instagram-scraper"
)

type Actors struct {
	TikTok    string
	Instagram string
}

func (a Actors) For(p video.Platform) string {
	switch {
	case p == video.TikTok && a.TikTok != "":
		return a.TikTok
	case p == video.TikTok:
		return DefaultTikTokActor
	case a.Instagram != "":
		return a.Instagram
	}
	return DefaultInstagramActor
}

// Criteria is what to scrape: a search term (hashtags start with #) or one video URL.
type Criteria struct {
	Platform video.Platform
	Query    string
	URL      string
	Limit    int
	// WithVideo asks the actor to host the video file itself (a paid add-on on
	// TikTok), so a fresh, fetchable copy exists at transform time.
	WithVideo bool
}

var nonTag = regexp.MustCompile(`[^a-z0-9]`)

// BuildInput maps criteria onto each actor's documented input schema.
func BuildInput(c Criteria) map[string]any {
	if c.Platform == video.TikTok {
		return tiktokInput(c)
	}
	return instagramInput(c)
}

func tiktokInput(c Criteria) map[string]any {
	in := map[string]any{
		"resultsPerPage":       c.Limit,
		"shouldDownloadVideos": c.WithVideo,
		"shouldDownloadCovers": true,
	}
	switch {
	case c.URL != "":
		in["postURLs"] = []string{c.URL}
		in["resultsPerPage"] = 1
	case strings.HasPrefix(c.Query, "#"):
		in["hashtags"] = []string{strings.TrimPrefix(c.Query, "#")}
	default:
		in["searchQueries"] = []string{c.Query}
		in["searchSection"] = "/video"
	}
	return in
}

// Instagram's own search endpoint is blocked for the actor, so terms are
// turned into the hashtag explore page, which still scrapes. Reels rather than
// posts, because a hashtag's post feed is mostly stills.
func instagramInput(c Criteria) map[string]any {
	if c.URL != "" {
		kind := "posts"
		if strings.Contains(c.URL, "/reel") {
			kind = "reels"
		}
		return map[string]any{"directUrls": []string{c.URL}, "resultsType": kind, "resultsLimit": 1, "addParentData": false}
	}
	tag := nonTag.ReplaceAllString(strings.ToLower(c.Query), "")
	return map[string]any{
		"directUrls":    []string{"https://www.instagram.com/explore/tags/" + tag + "/"},
		"resultsType":   "reels",
		"resultsLimit":  c.Limit,
		"addParentData": false,
	}
}
