package gemini

import (
	"context"
	"errors"
	"fmt"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"google.golang.org/genai"
)

// DefaultModel is the stable planning model for new work. The 2.5 family is
// capacity-restricted to past users, so new integrations must not default to it.
const DefaultModel = "gemini-3.8-flash"

// DefaultFallbackModel answers when the main model keeps failing with a busy or
// unavailable error. Overload is per model, so a second model often still works.
const DefaultFallbackModel = "gemini-3.5-flash"

// DefaultTimeout bounds a single planning call. Retries share the caller's
// context, so a cancelled request stops waiting between attempts too.
const DefaultTimeout = 60 * time.Second

const maxAttempts = 3

// bigPayload is the size above which a request is not repeated on the same model.
// Every try sends the whole video again from the API server, which Render meters,
// so a large request moves on to the fallback model instead of retrying.
const bigPayload = 4 << 20

type Config struct {
	// APIKey is a fixed key. Ignored when KeyFunc is set.
	APIKey string
	// KeyFunc supplies the key per request, so a key an admin pastes in takes
	// effect without a restart.
	KeyFunc provider.KeyFunc
	// Empty selects DefaultModel.
	Model string
	// Tried once the main model has used up its retries on a transient failure.
	// Empty selects DefaultFallbackModel; the same name as Model turns it off.
	FallbackModel string
	// Empty selects DefaultTimeout. Applies per attempt.
	Timeout time.Duration
	// Nil selects the default client. Tests inject a stub transport here.
	HTTPClient *http.Client
	// Optional. Receives one record per successful call.
	Recorder Recorder
	// BaseURL sends every call elsewhere. Empty is Google itself; the test stack points it at its fake.
	BaseURL string
}

type Client struct {
	keyFn      provider.KeyFunc
	baseURL    string
	httpClient *http.Client
	model      string
	fallback   string
	timeout    time.Duration
	recorder   Recorder

	mu     sync.Mutex
	key    string
	client *genai.Client
}

// Usage mirrors the token counts Gemini reports, for spend guardrails.
type Usage struct {
	PromptTokens int32
	// CandidatesTokens is the visible answer only.
	CandidatesTokens int32
	// ThoughtsTokens is the model's thinking, which Google bills as output.
	ThoughtsTokens int32
	TotalTokens    int32
}

// OutputTokens is everything billed at the output price: the answer and the thinking.
func (u Usage) OutputTokens() int32 { return u.CandidatesTokens + u.ThoughtsTokens }

// thinkingLevel keeps the model's thinking short. Every call here asks for
// structured JSON against a schema, where long thinking adds cost (thinking is
// billed as output) without a better answer.
const thinkingLevel = genai.ThinkingLevelLow

func NewClient(cfg Config) (*Client, error) {
	keyFn := cfg.KeyFunc
	if keyFn == nil {
		if strings.TrimSpace(cfg.APIKey) == "" {
			return nil, errors.New("gemini: an API key or key source is required")
		}
		keyFn = provider.StaticKey(cfg.APIKey)
	}
	model := cfg.Model
	if model == "" {
		model = DefaultModel
	}
	fallback := cfg.FallbackModel
	if fallback == "" {
		fallback = DefaultFallbackModel
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	return &Client{keyFn: keyFn, baseURL: cfg.BaseURL, httpClient: cfg.HTTPClient, model: model, fallback: fallback, timeout: timeout, recorder: cfg.Recorder}, nil
}

// sdk returns the SDK client for the current key, rebuilding it only when the
// key has changed.
func (c *Client) sdk(ctx context.Context) (*genai.Client, error) {
	key, err := c.keyFn(ctx)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.client != nil && key == c.key {
		return c.client, nil
	}
	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey: key, Backend: genai.BackendGeminiAPI, HTTPClient: c.httpClient,
		HTTPOptions: genai.HTTPOptions{BaseURL: c.baseURL},
	})
	if err != nil {
		return nil, fmt.Errorf("gemini: create client: %w", err)
	}
	c.key, c.client = key, client
	return client, nil
}

// Media is something the model watches or reads alongside the prompt: raw bytes
// with their type, or a public URL the API fetches itself (YouTube links).
type Media struct {
	Data []byte
	MIME string
	URI  string
}

// Output limits. The model's thinking counts toward them as well as the answer,
// so they leave room for both; a limit that is too tight cuts the JSON off.
const (
	textMaxOutput  = 8192
	mediaMaxOutput = 12288
	// Watching a video takes longer than reading a request.
	mediaTimeout = 150 * time.Second
)

// GenerateJSON asks the model for one JSON document conforming to schema.
// The schema is enforced by the API; callers still validate the decoded plan
// because a conforming shape can carry disallowed content.
func (c *Client) GenerateJSON(ctx context.Context, system, user string, schema *genai.Schema) ([]byte, Usage, error) {
	return c.generate(ctx, system, user, nil, schema)
}

// GenerateJSONFromMedia is GenerateJSON with video, audio or pictures attached.
// The media is data to describe, never instructions: callers say so in system.
func (c *Client) GenerateJSONFromMedia(ctx context.Context, system, user string, media []Media, schema *genai.Schema) ([]byte, Usage, error) {
	return c.generate(ctx, system, user, media, schema)
}

func (c *Client) generate(ctx context.Context, system, user string, media []Media, schema *genai.Schema) ([]byte, Usage, error) {
	temperature := float32(0.2)
	maxOut, timeout := int32(textMaxOutput), c.timeout
	if len(media) > 0 {
		maxOut, timeout = mediaMaxOutput, max(c.timeout, mediaTimeout)
	}
	if n := outputLimitFrom(ctx); n > maxOut {
		maxOut = n
	}
	config := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(system, "system"),
		ResponseMIMEType:  "application/json",
		ResponseSchema:    schema,
		Temperature:       &temperature,
		MaxOutputTokens:   maxOut,
		ThinkingConfig:    &genai.ThinkingConfig{ThinkingLevel: thinkingLevel},
	}
	parts := make([]*genai.Part, 0, len(media)+1)
	for _, m := range media {
		if m.URI != "" {
			parts = append(parts, genai.NewPartFromURI(m.URI, m.MIME))
		} else {
			parts = append(parts, genai.NewPartFromBytes(m.Data, m.MIME))
		}
	}
	parts = append(parts, genai.NewPartFromText(user))
	contents := []*genai.Content{genai.NewContentFromParts(parts, "user")}

	models := []string{c.model}
	if c.fallback != "" && c.fallback != c.model {
		models = append(models, c.fallback)
	}
	tries := maxAttempts
	if inlineBytes(media) > bigPayload {
		tries = 1
	}
	var lastErr error
	for i, model := range models {
		for attempt := 1; attempt <= tries; attempt++ {
			data, usage, err := c.attempt(ctx, model, contents, config, timeout)
			if err != nil && config.ThinkingConfig != nil && rejectsThinking(err) {
				// A model that does not take a thinking level must still answer.
				slog.Warn("gemini model refused the thinking level, retrying without it", "model", model)
				plain := *config
				plain.ThinkingConfig = nil
				data, usage, err = c.attempt(ctx, model, contents, &plain, timeout)
			}
			if err == nil {
				return data, usage, nil
			}
			lastErr = err
			if !retryable(err) || attempt == tries {
				break
			}
			backoff := time.Duration(attempt) * time.Second
			select {
			case <-ctx.Done():
				return nil, Usage{}, fmt.Errorf("gemini: cancelled while backing off: %w", ctx.Err())
			case <-time.After(backoff):
			}
		}
		// Only a busy or unavailable model is worth swapping; a bad request would fail the same way.
		if !retryable(lastErr) {
			break
		}
		if i+1 < len(models) {
			slog.Warn("gemini model unavailable, trying the fallback", "model", model, "fallback", models[i+1])
		}
	}
	return nil, Usage{}, lastErr
}

func (c *Client) attempt(ctx context.Context, model string, contents []*genai.Content, config *genai.GenerateContentConfig, timeout time.Duration) ([]byte, Usage, error) {
	attemptCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	sdk, err := c.sdk(ctx)
	if err != nil {
		return nil, Usage{}, err
	}
	resp, err := sdk.Models.GenerateContent(attemptCtx, model, contents, config)
	if err != nil {
		return nil, Usage{}, wrapError(err)
	}
	var usage Usage
	if resp.UsageMetadata != nil {
		usage = Usage{
			PromptTokens:     resp.UsageMetadata.PromptTokenCount,
			CandidatesTokens: resp.UsageMetadata.CandidatesTokenCount,
			ThoughtsTokens:   resp.UsageMetadata.ThoughtsTokenCount,
			TotalTokens:      resp.UsageMetadata.TotalTokenCount,
		}
	}
	// Recorded before the answer is checked: an empty or cut-off answer was
	// still billed, and a retry after it is billed again.
	c.record(ctx, model, usage)
	text := strings.TrimSpace(resp.Text())
	if text == "" {
		return nil, Usage{}, errors.New("gemini: empty response")
	}
	return []byte(text), usage, nil
}

// record stores what one call cost the provider. Counts only: no prompt or
// response text.
func (c *Client) record(ctx context.Context, model string, usage Usage) {
	if c.recorder != nil {
		scope := ScopeFrom(ctx)
		c.recorder.RecordUsage(ctx, Record{Provider: "gemini", Model: model, Purpose: scope.Purpose,
			UserID: scope.UserID, JobID: scope.JobID, Usage: usage})
	}
	slog.Info("gemini usage", "model", model, "purpose", ScopeFrom(ctx).Purpose, "prompt_tokens", usage.PromptTokens,
		"output_tokens", usage.CandidatesTokens, "thinking_tokens", usage.ThoughtsTokens, "total_tokens", usage.TotalTokens)
}

// rejectsThinking says a request failed because the model does not accept a
// thinking setting, rather than for any other reason.
func rejectsThinking(err error) bool {
	var pe *provider.Error
	return errors.As(err, &pe) && pe.Status == http.StatusBadRequest && strings.Contains(strings.ToLower(pe.Message), "think")
}

// wrapError turns the SDK's failure into a classified provider error. The
// provider's message is kept for logs and classification only; callers show
// users provider.UserMessage, never this text.
func wrapError(err error) error {
	var apiErr genai.APIError
	if !errors.As(err, &apiErr) {
		return &provider.Error{Provider: "gemini", Message: "request failed: " + err.Error(), Transient: errors.Is(err, context.DeadlineExceeded), Err: err}
	}
	msg := apiErr.Message
	if len(msg) > 300 {
		msg = msg[:300]
	}
	return &provider.Error{Provider: "gemini", Status: apiErr.Code, Code: apiErr.Status, Message: msg, Transient: retryableStatus(apiErr.Code)}
}

// retryable covers rate limits and transient server failures, but not an
// exhausted quota, which retrying only makes worse.
func retryable(err error) bool {
	var pe *provider.Error
	return errors.As(err, &pe) && pe.Transient && provider.Classify(err) == provider.ClassTransient
}

func retryableStatus(code int) bool {
	switch code {
	case http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway,
		http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	}
	return false
}

// inlineBytes is how much media this request sends as bytes rather than by link.
func inlineBytes(media []Media) int {
	n := 0
	for _, m := range media {
		if m.URI == "" {
			n += len(m.Data)
		}
	}
	return n
}
