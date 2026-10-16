// Package elevenlabs wraps the ElevenLabs endpoints used for voice cloning
// and speech: voice listing, text to speech, voice creation from samples,
// and voice deletion. Authentication is the xi-api-key header.
package elevenlabs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	providerName   = "elevenlabs"
	defaultAPIBase = "https://api.elevenlabs.io"
	maxBodyBytes   = 4 << 20

	// MaxSampleBytes caps one cloning sample. Voice samples are short by
	// nature; anything larger is rejected before it leaves the server.
	MaxSampleBytes = 10 << 20
	// DefaultModel is the multilingual speech model.
	DefaultModel = "eleven_multilingual_v2"
)

type Client struct {
	key     provider.KeyFunc
	apiBase string
	http    *http.Client
}

func NewClientWithKey(key provider.KeyFunc) *Client {
	return &Client{key: key, apiBase: defaultAPIBase, http: &http.Client{Timeout: 60 * time.Second}}
}

// WithBaseURL points the client elsewhere; used by tests.
func (c *Client) WithBaseURL(base string) *Client {
	clone := *c
	clone.apiBase = strings.TrimRight(base, "/")
	return &clone
}

// Voice is one ElevenLabs voice, library or cloned.
type Voice struct {
	ID       string `json:"voice_id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

// LibraryVoice is a voice anyone may use.
type LibraryVoice struct {
	ID   string
	Name string
}

// LibraryVoices returns the voices on the key's account, including the
// shared premade library.
func (c *Client) LibraryVoices(ctx context.Context) ([]LibraryVoice, error) {
	voices, err := c.ListVoices(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]LibraryVoice, 0, len(voices))
	for _, voice := range voices {
		out = append(out, LibraryVoice{ID: voice.ID, Name: voice.Name})
	}
	return out, nil
}

// VoiceExists reports whether a voice id exists on the account. Only the
// status matters, so the shape of a voice never affects the answer.
func (c *Client) VoiceExists(ctx context.Context, voiceID string) (bool, error) {
	if voiceID == "" {
		return false, nil
	}
	key, err := c.key(ctx)
	if err != nil {
		return false, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiBase+"/v1/voices/"+voiceID, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("xi-api-key", key)
	resp, err := c.http.Do(req)
	if err != nil {
		return false, &provider.Error{Provider: providerName, Message: "could not reach ElevenLabs", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
		return false, provider.FromHTTPStatus(providerName, resp.StatusCode, string(body))
	}
	return true, nil
}

// ListVoices returns the voices on the key's account.
func (c *Client) ListVoices(ctx context.Context) ([]Voice, error) {
	key, err := c.key(ctx)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiBase+"/v1/voices", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("xi-api-key", key)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, &provider.Error{Provider: providerName, Message: "could not reach ElevenLabs", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
	if resp.StatusCode >= 300 {
		return nil, provider.FromHTTPStatus(providerName, resp.StatusCode, string(body))
	}
	var out struct {
		Voices []Voice `json:"voices"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, &provider.Error{Provider: providerName, Message: "unreadable voice list"}
	}
	return out.Voices, nil
}

// Speak renders text in a voice and returns MP3 bytes.
func (c *Client) Speak(ctx context.Context, voiceID, model, text string) ([]byte, error) {
	if voiceID == "" || strings.TrimSpace(text) == "" {
		return nil, &provider.Error{Provider: providerName, Message: "voice and text are required"}
	}
	if model == "" {
		model = DefaultModel
	}
	key, err := c.key(ctx)
	if err != nil {
		return nil, err
	}
	payload, err := json.Marshal(map[string]any{"text": text, "model_id": model})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase+"/v1/text-to-speech/"+voiceID, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("xi-api-key", key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, &provider.Error{Provider: providerName, Message: "could not reach ElevenLabs", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	audio, _ := io.ReadAll(io.LimitReader(resp.Body, 10<<20))
	if resp.StatusCode >= 300 {
		return nil, provider.FromHTTPStatus(providerName, resp.StatusCode, string(audio))
	}
	if len(audio) == 0 {
		return nil, &provider.Error{Provider: providerName, Message: "empty speech reply"}
	}
	return audio, nil
}

// Sample is one cloning recording.
type Sample struct {
	FileName string
	MimeType string
	Data     []byte
}

// AddVoice clones a voice from samples and returns its id. Sample bytes are
// capped before upload; oversized recordings are the caller's error, not a
// provider round trip.
func (c *Client) AddVoice(ctx context.Context, name string, samples []Sample) (string, error) {
	if strings.TrimSpace(name) == "" || len(samples) == 0 {
		return "", &provider.Error{Provider: providerName, Message: "a name and at least one sample are required"}
	}
	key, err := c.key(ctx)
	if err != nil {
		return "", err
	}
	var form bytes.Buffer
	writer := multipart.NewWriter(&form)
	if err := writer.WriteField("name", strings.TrimSpace(name)); err != nil {
		return "", err
	}
	for _, sample := range samples {
		if len(sample.Data) == 0 || len(sample.Data) > MaxSampleBytes {
			return "", &provider.Error{Provider: providerName, Message: fmt.Sprintf("sample %q must be 1 byte to %d MB", sample.FileName, MaxSampleBytes>>20)}
		}
		part, err := writer.CreateFormFile("files", sample.FileName)
		if err != nil {
			return "", err
		}
		if _, err := part.Write(sample.Data); err != nil {
			return "", err
		}
	}
	if err := writer.Close(); err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase+"/v1/voices/add", &form)
	if err != nil {
		return "", err
	}
	req.Header.Set("xi-api-key", key)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	resp, err := c.http.Do(req)
	if err != nil {
		return "", &provider.Error{Provider: providerName, Message: "could not reach ElevenLabs", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
	if resp.StatusCode >= 300 {
		return "", provider.FromHTTPStatus(providerName, resp.StatusCode, string(body))
	}
	var out struct {
		VoiceID string `json:"voice_id"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.VoiceID == "" {
		return "", &provider.Error{Provider: providerName, Message: "unreadable clone reply"}
	}
	return out.VoiceID, nil
}

// DeleteVoice removes a cloned voice.
func (c *Client) DeleteVoice(ctx context.Context, voiceID string) error {
	if voiceID == "" {
		return &provider.Error{Provider: providerName, Message: "voice id is required"}
	}
	key, err := c.key(ctx)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.apiBase+"/v1/voices/"+voiceID, nil)
	if err != nil {
		return err
	}
	req.Header.Set("xi-api-key", key)
	resp, err := c.http.Do(req)
	if err != nil {
		return &provider.Error{Provider: providerName, Message: "could not reach ElevenLabs", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
		return provider.FromHTTPStatus(providerName, resp.StatusCode, string(body))
	}
	return nil
}
