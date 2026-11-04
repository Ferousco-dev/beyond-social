package apify

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

// ErrMalformed means the actor returned rows but none could be understood,
// which usually means its output format changed.
var ErrMalformed = errors.New("apify rows could not be normalised")

type tiktokRow struct {
	ID            string   `json:"id"`
	Text          string   `json:"text"`
	WebVideoURL   string   `json:"webVideoUrl"`
	CreateTimeISO string   `json:"createTimeISO"`
	PlayCount     *int64   `json:"playCount"`
	DiggCount     *int64   `json:"diggCount"`
	CommentCount  *int64   `json:"commentCount"`
	ShareCount    *int64   `json:"shareCount"`
	MediaURLs     []string `json:"mediaUrls"`
	Error         string   `json:"error"`
	AuthorMeta    struct {
		Name     string `json:"name"`
		NickName string `json:"nickName"`
	} `json:"authorMeta"`
	VideoMeta struct {
		Duration     *float64 `json:"duration"`
		CoverURL     string   `json:"coverUrl"`
		DownloadAddr string   `json:"downloadAddr"`
	} `json:"videoMeta"`
	Hashtags []struct {
		Name string `json:"name"`
	} `json:"hashtags"`
}

type instagramRow struct {
	ID             string   `json:"id"`
	ShortCode      string   `json:"shortCode"`
	URL            string   `json:"url"`
	Caption        string   `json:"caption"`
	Type           string   `json:"type"`
	OwnerUsername  string   `json:"ownerUsername"`
	OwnerFullName  string   `json:"ownerFullName"`
	DisplayURL     string   `json:"displayUrl"`
	VideoURL       string   `json:"videoUrl"`
	VideoDuration  *float64 `json:"videoDuration"`
	VideoViewCount *int64   `json:"videoViewCount"`
	VideoPlayCount *int64   `json:"videoPlayCount"`
	LikesCount     *int64   `json:"likesCount"`
	CommentsCount  *int64   `json:"commentsCount"`
	Timestamp      string   `json:"timestamp"`
	Hashtags       []string `json:"hashtags"`
	Error          string   `json:"error"`
}

// Normalize converts raw actor rows into the shared model. Rows that cannot be
// used (errors, stills, no ID, off-platform links) are skipped, and duplicates
// are dropped. An error is returned only when every row was unusable because
// of its shape.
func Normalize(p video.Platform, rows []json.RawMessage, now time.Time) ([]video.Video, error) {
	out := make([]video.Video, 0, len(rows))
	seen := map[string]bool{}
	malformed := 0
	for _, raw := range rows {
		var v *video.Video
		var err error
		if p == video.TikTok {
			v, err = normalizeTikTok(raw)
		} else {
			v, err = normalizeInstagram(raw)
		}
		if err != nil {
			malformed++
			continue
		}
		if v == nil || seen[v.SourceID] {
			continue
		}
		seen[v.SourceID] = true
		v.DiscoveredAt = now
		out = append(out, *v)
	}
	if len(out) == 0 && malformed > 0 && malformed == len(rows) {
		return nil, fmt.Errorf("%w: %d rows", ErrMalformed, malformed)
	}
	return out, nil
}

func normalizeTikTok(raw json.RawMessage) (*video.Video, error) {
	var r tiktokRow
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, err
	}
	if r.Error != "" || r.ID == "" || !video.IsPlatformHost(video.TikTok, r.WebVideoURL) {
		return nil, nil
	}
	v := &video.Video{
		Platform: video.TikTok, SourceID: r.ID, PageURL: r.WebVideoURL, Caption: r.Text,
		CreatorHandle: r.AuthorMeta.Name, CreatorName: r.AuthorMeta.NickName,
		ThumbnailURL: httpsOnly(r.VideoMeta.CoverURL), DurationSeconds: r.VideoMeta.Duration,
		ViewCount: r.PlayCount, LikeCount: r.DiggCount, CommentCount: r.CommentCount, ShareCount: r.ShareCount,
		Hashtags: []string{}, PublishedAt: parseTime(r.CreateTimeISO),
	}
	if len(r.MediaURLs) > 0 {
		v.VideoURL = httpsOnly(r.MediaURLs[0])
	}
	if v.VideoURL == "" {
		v.VideoURL = httpsOnly(r.VideoMeta.DownloadAddr)
	}
	for _, h := range r.Hashtags {
		if h.Name != "" {
			v.Hashtags = append(v.Hashtags, h.Name)
		}
	}
	return v, nil
}

func normalizeInstagram(raw json.RawMessage) (*video.Video, error) {
	var r instagramRow
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, err
	}
	isVideo := r.VideoURL != "" || strings.EqualFold(r.Type, "Video")
	id := r.ShortCode
	if id == "" {
		id = r.ID
	}
	if r.Error != "" || id == "" || !isVideo || !video.IsPlatformHost(video.Instagram, r.URL) {
		return nil, nil
	}
	views := r.VideoPlayCount
	if views == nil {
		views = r.VideoViewCount
	}
	tags := r.Hashtags
	if tags == nil {
		tags = []string{}
	}
	return &video.Video{
		Platform: video.Instagram, SourceID: id, PageURL: r.URL, Caption: r.Caption,
		CreatorHandle: r.OwnerUsername, CreatorName: r.OwnerFullName,
		ThumbnailURL: httpsOnly(r.DisplayURL), VideoURL: httpsOnly(r.VideoURL), DurationSeconds: r.VideoDuration,
		ViewCount: views, LikeCount: nonNegative(r.LikesCount), CommentCount: r.CommentsCount,
		Hashtags: tags, PublishedAt: parseTime(r.Timestamp),
	}, nil
}

// PickVideoURL returns the first fetchable file URL in a raw row, for the
// single-video resolve step. Empty means the actor did not host or expose a file.
func PickVideoURL(p video.Platform, raw json.RawMessage) string {
	var v *video.Video
	if p == video.TikTok {
		v, _ = normalizeTikTok(raw)
	} else {
		v, _ = normalizeInstagram(raw)
	}
	if v == nil {
		return ""
	}
	return v.VideoURL
}

// httpsOnly drops anything that is not an https URL, since these end up in <img> and fetches.
func httpsOnly(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Host == "" {
		return ""
	}
	return raw
}

func parseTime(s string) *time.Time {
	if s == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05.000Z"} {
		if t, err := time.Parse(layout, s); err == nil {
			t = t.UTC()
			return &t
		}
	}
	return nil
}

// Instagram reports -1 for hidden like counts.
func nonNegative(n *int64) *int64 {
	if n == nil || *n < 0 {
		return nil
	}
	return n
}
