package heygen

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
)

type Voice struct {
	ID              string `json:"voice_id"`
	Name            string `json:"name"`
	Language        string `json:"language,omitempty"`
	Gender          string `json:"gender,omitempty"`
	Type            string `json:"type,omitempty"` // public or private
	PreviewAudioURL string `json:"preview_audio_url,omitempty"`
}

type VoicePage struct {
	Voices    []Voice
	HasMore   bool
	NextToken string
}

type VoiceQuery struct {
	Type     string // "public" for the shared library
	Language string
	Gender   string
	Limit    int
	Token    string
}

func (c *Client) ListVoices(ctx context.Context, q VoiceQuery) (VoicePage, error) {
	v := url.Values{}
	for k, val := range map[string]string{"type": q.Type, "language": q.Language, "gender": q.Gender, "token": q.Token} {
		if val != "" {
			v.Set(k, val)
		}
	}
	if q.Limit > 0 {
		v.Set("limit", strconv.Itoa(q.Limit))
	}
	var out struct {
		Data []struct {
			Voice
			Preview string `json:"preview_audio_url"`
		} `json:"data"`
		HasMore   bool   `json:"has_more"`
		NextToken string `json:"next_token"`
	}
	if err := c.do(ctx, http.MethodGet, "/voices", v, nil, "", &out); err != nil {
		return VoicePage{}, err
	}
	page := VoicePage{HasMore: out.HasMore, NextToken: out.NextToken}
	for _, item := range out.Data {
		voice := item.Voice
		voice.PreviewAudioURL = httpsOnly(item.Preview)
		page.Voices = append(page.Voices, voice)
	}
	return page, nil
}

// VoiceExists reports whether HeyGen knows the voice, returning it if so.
// A 404 is a definite "no", not an error.
func (c *Client) GetVoice(ctx context.Context, voiceID string) (Voice, bool, error) {
	var out struct {
		Data struct {
			ID      string `json:"voice_id"`
			Name    string `json:"name"`
			Lang    string `json:"language"`
			Gender  string `json:"gender"`
			Preview string `json:"preview_audio_url"`
			Status  string `json:"status"`
		} `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/voices/"+url.PathEscape(voiceID), nil, nil, "", &out); err != nil {
		if HTTPStatus(err) == http.StatusNotFound {
			return Voice{}, false, nil
		}
		return Voice{}, false, err
	}
	d := out.Data
	if d.Status == "processing" || d.Status == "failed" {
		return Voice{}, false, nil // a clone that is not usable yet
	}
	return Voice{ID: d.ID, Name: d.Name, Language: d.Lang, Gender: d.Gender, PreviewAudioURL: httpsOnly(d.Preview)}, d.ID != "", nil
}
