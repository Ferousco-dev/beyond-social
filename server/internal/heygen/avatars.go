package heygen

import (
	"context"
	"net/http"
	"net/url"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Status values exactly as HeyGen documents them for avatars and looks.
const (
	StatusProcessing     = "processing"
	StatusPendingConsent = "pending_consent"
	StatusFailed         = "failed"
	StatusCompleted      = "completed"

	ConsentPending  = "pending"
	ConsentAccepted = "accepted"
	ConsentRejected = "rejected"
)

// Twin is what creating or reading an avatar tells us. IDs are HeyGen's own.
type Twin struct {
	GroupID        string // the character; consent and training hang off this
	LookID         string // the appearance; video generation names this
	Status         string
	ConsentStatus  string
	DefaultVoiceID string
	PreviewImage   string
	PreviewVideo   string
	ErrorCode      string
	ErrorMessage   string
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type groupItem struct {
	ID             string    `json:"id"`
	Status         string    `json:"status"`
	ConsentStatus  string    `json:"consent_status"`
	DefaultVoiceID string    `json:"default_voice_id"`
	PreviewImage   string    `json:"preview_image_url"`
	PreviewVideo   string    `json:"preview_video_url"`
	Error          *apiError `json:"error"`
}

type lookItem struct {
	ID             string    `json:"id"`
	Status         string    `json:"status"`
	DefaultVoiceID string    `json:"default_voice_id"`
	Error          *apiError `json:"error"`
}

// CreateDigitalTwin starts training a twin from footage HeyGen fetches from
// fileURL. Training is asynchronous. The voice is cloned from the footage as
// part of this, and its ID comes back as DefaultVoiceID.
func (c *Client) CreateDigitalTwin(ctx context.Context, name, fileURL, idempotencyKey string) (Twin, error) {
	var out struct {
		Data struct {
			Item  *lookItem  `json:"avatar_item"`
			Group *groupItem `json:"avatar_group"`
		} `json:"data"`
	}
	body := map[string]any{"type": "digital_twin", "name": name, "file": map[string]string{"type": "url", "url": fileURL}}
	if err := c.do(ctx, http.MethodPost, "/avatars", nil, body, idempotencyKey, &out); err != nil {
		return Twin{}, err
	}
	t := Twin{}
	if g := out.Data.Group; g != nil {
		t.GroupID, t.Status, t.ConsentStatus, t.DefaultVoiceID = g.ID, g.Status, g.ConsentStatus, g.DefaultVoiceID
		t.applyError(g.Error)
	}
	if l := out.Data.Item; l != nil {
		t.LookID = l.ID
		if t.Status == "" {
			t.Status = l.Status
		}
		if t.DefaultVoiceID == "" {
			t.DefaultVoiceID = l.DefaultVoiceID
		}
		t.applyError(l.Error)
	}
	if t.GroupID == "" || t.LookID == "" {
		return Twin{}, &provider.Error{Provider: providerName, Message: "avatar response had no group or look id"}
	}
	return t, nil
}

// GetGroup reads the character: overall training status and consent state.
func (c *Client) GetGroup(ctx context.Context, groupID string) (Twin, error) {
	var out struct {
		Data groupItem `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/avatars/"+url.PathEscape(groupID), nil, nil, "", &out); err != nil {
		return Twin{}, err
	}
	g := out.Data
	t := Twin{GroupID: g.ID, Status: g.Status, ConsentStatus: g.ConsentStatus, DefaultVoiceID: g.DefaultVoiceID, PreviewImage: g.PreviewImage, PreviewVideo: g.PreviewVideo}
	t.applyError(g.Error)
	return t, nil
}

// GetLook reads one appearance. Videos can only be made from a completed look.
func (c *Client) GetLook(ctx context.Context, lookID string) (Twin, error) {
	var out struct {
		Data lookItem `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/avatars/looks/"+url.PathEscape(lookID), nil, nil, "", &out); err != nil {
		return Twin{}, err
	}
	l := out.Data
	t := Twin{LookID: l.ID, Status: l.Status, DefaultVoiceID: l.DefaultVoiceID}
	t.applyError(l.Error)
	return t, nil
}

// CreateConsent starts HeyGen's hosted webcam consent (the self-service level).
// The returned URL is valid for 24 hours and one successful submission.
func (c *Client) CreateConsent(ctx context.Context, groupID, rerouteURL, idempotencyKey string) (consentURL string, err error) {
	var out struct {
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
	}
	body := map[string]any{}
	if rerouteURL != "" {
		body["reroute_url"] = rerouteURL
	}
	err = c.do(ctx, http.MethodPost, "/avatars/"+url.PathEscape(groupID)+"/consent", nil, body, idempotencyKey, &out)
	return out.Data.URL, err
}

func (t *Twin) applyError(e *apiError) {
	if e != nil {
		t.ErrorCode, t.ErrorMessage = e.Code, e.Message
	}
}
