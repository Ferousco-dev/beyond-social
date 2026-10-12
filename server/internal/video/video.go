// Package video holds the provider-neutral model for a discovered video.
package video

import "time"

type Platform string

const (
	TikTok    Platform = "tiktok"
	Instagram Platform = "instagram"
)

func (p Platform) Valid() bool { return p == TikTok || p == Instagram }

// Video is one discovered video. Anything a provider did not report is left
// empty or nil; nothing is estimated or invented.
type Video struct {
	ID              string     `json:"id,omitempty"` // internal ID once persisted
	Platform        Platform   `json:"platform"`
	SourceID        string     `json:"source_video_id"`
	PageURL         string     `json:"url"`
	Caption         string     `json:"caption,omitempty"`
	CreatorHandle   string     `json:"creator_handle,omitempty"`
	CreatorName     string     `json:"creator_name,omitempty"`
	ThumbnailURL    string     `json:"thumbnail_url,omitempty"`
	VideoURL        string     `json:"video_url,omitempty"`
	DurationSeconds *float64   `json:"duration_seconds,omitempty"`
	ViewCount       *int64     `json:"view_count,omitempty"`
	LikeCount       *int64     `json:"like_count,omitempty"`
	CommentCount    *int64     `json:"comment_count,omitempty"`
	ShareCount      *int64     `json:"share_count,omitempty"`
	Hashtags        []string   `json:"hashtags"`
	PublishedAt     *time.Time `json:"published_at,omitempty"`
	DiscoveredAt    time.Time  `json:"discovered_at"`
}
