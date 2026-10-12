package heygen

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
)

var ErrBadSignature = errors.New("webhook signature is invalid")

// Event types this service reacts to.
const (
	EventVideoSuccess = "avatar_video.success"
	EventVideoFail    = "avatar_video.fail"
)

// VerifyWebhook checks HeyGen's documented signature: a hex HMAC-SHA256 of the
// raw request body, keyed with the endpoint secret, sent in the `signature`
// header. It must be computed over the exact bytes received.
func VerifyWebhook(secret string, rawBody []byte, signature string) error {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawBody)
	want := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(want), []byte(strings.ToLower(strings.TrimSpace(signature)))) {
		return ErrBadSignature
	}
	return nil
}

// SignWebhook produces a signature the way HeyGen would. Used by tests.
func SignWebhook(secret string, rawBody []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawBody)
	return hex.EncodeToString(mac.Sum(nil))
}

// WebhookRef identifies what a delivery is about. Nothing else in the payload
// is trusted: the caller re-reads the video from HeyGen's API.
type WebhookRef struct {
	EventType  string
	VideoID    string
	CallbackID string
}

func ParseWebhook(body []byte) (WebhookRef, error) {
	var p struct {
		EventType string `json:"event_type"`
		Data      struct {
			VideoID    string `json:"video_id"`
			CallbackID string `json:"callback_id"`
		} `json:"event_data"`
	}
	if err := json.Unmarshal(body, &p); err != nil || (p.Data.VideoID == "" && p.Data.CallbackID == "") {
		return WebhookRef{}, errors.New("webhook has no video reference")
	}
	return WebhookRef{EventType: p.EventType, VideoID: p.Data.VideoID, CallbackID: p.Data.CallbackID}, nil
}
