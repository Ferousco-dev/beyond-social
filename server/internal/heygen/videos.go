package heygen

import (
	"context"
	"net/http"
	"net/url"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Video statuses as returned by GET /v3/videos/{id}.
const (
	VideoPending    = "pending"
	VideoProcessing = "processing"
	VideoCompleted  = "completed"
	VideoFailed     = "failed"
)

type VideoRequest struct {
	AvatarID    string // the look ID
	VoiceID     string
	Script      string
	Title       string
	CallbackURL string
	CallbackID  string
}

type Video struct {
	ID             string
	Status         string
	VideoURL       string // presigned and short-lived; re-read for a fresh one
	ThumbnailURL   string
	DurationSecond float64
	FailureCode    string
	FailureMessage string
}

// CreateVideo asks for a talking-avatar video. The idempotency key makes a
// retry after an ambiguous failure return the original video rather than
// starting (and billing) a second one.
func (c *Client) CreateVideo(ctx context.Context, r VideoRequest, idempotencyKey string) (string, error) {
	body := map[string]any{
		"type": "avatar", "avatar_id": r.AvatarID, "voice_id": r.VoiceID, "script": r.Script,
		"engine": map[string]string{"type": "avatar_v"}, "aspect_ratio": "9:16", "resolution": "1080p", "output_format": "mp4",
	}
	if r.Title != "" {
		body["title"] = r.Title
	}
	if r.CallbackURL != "" {
		body["callback_url"] = r.CallbackURL
		body["callback_id"] = r.CallbackID
	}
	var out struct {
		Data struct {
			VideoID string `json:"video_id"`
		} `json:"data"`
	}
	if err := c.do(ctx, http.MethodPost, "/videos", nil, body, idempotencyKey, &out); err != nil {
		return "", err
	}
	if out.Data.VideoID == "" {
		return "", &provider.Error{Provider: providerName, Message: "video response had no id"}
	}
	return out.Data.VideoID, nil
}

func (c *Client) GetVideo(ctx context.Context, videoID string) (Video, error) {
	var out struct {
		Data struct {
			ID             string  `json:"id"`
			Status         string  `json:"status"`
			VideoURL       string  `json:"video_url"`
			ThumbnailURL   string  `json:"thumbnail_url"`
			Duration       float64 `json:"duration"`
			FailureCode    string  `json:"failure_code"`
			FailureMessage string  `json:"failure_message"`
		} `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/videos/"+url.PathEscape(videoID), nil, nil, "", &out); err != nil {
		return Video{}, err
	}
	d := out.Data
	return Video{ID: d.ID, Status: d.Status, VideoURL: httpsOnly(d.VideoURL), ThumbnailURL: httpsOnly(d.ThumbnailURL),
		DurationSecond: d.Duration, FailureCode: d.FailureCode, FailureMessage: d.FailureMessage}, nil
}

// httpsOnly drops anything that is not an https URL before it can reach a client.
func httpsOnly(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Host == "" {
		return ""
	}
	return raw
}
