package gemini

import (
	"context"
	"errors"
	"fmt"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"net/http"
	"strings"
	"sync"
	"time"

	"google.golang.org/genai"
)

// DefaultModel is the stable planning model for new work. The 2.5 family is
// capacity-restricted to past users, so new integrations must not default to it.
const DefaultModel = "gemini-3.8-flash"

// DefaultTimeout bounds a single planning call. Retries share the caller's
// context, so a cancelled request stops waiting between attempts too.
const DefaultTimeout = 60 * time.Second

const maxAttempts = 3

type Config struct {
	// APIKey is a fixed key. Ignored when KeyFunc is set.
	APIKey string
	// KeyFunc supplies the key per request, so a key an admin pastes in takes
	// effect without a restart.
	KeyFunc provider.KeyFunc
	// Empty selects DefaultModel.
	Model string
	// Empty selects DefaultTimeout. Applies per attempt.
	Timeout time.Duration
	// Nil selects the default client. Tests inject a stub transport here.
	HTTPClient *http.Client
}

type Client struct {
	keyFn      provider.KeyFunc
	httpClient *http.Client
	model      string
	timeout    time.Duration

	mu     sync.Mutex
	key    string
	client *genai.Client
}

// Usage mirrors the token counts Gemini reports, for spend guardrails.
type Usage struct {
	PromptTokens     int32
	CandidatesTokens int32
	TotalTokens      int32
}

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
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	return &Client{keyFn: keyFn, httpClient: cfg.HTTPClient, model: model, timeout: timeout}, nil
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
	})
	if err != nil {
		return nil, fmt.Errorf("gemini: create client: %w", err)
	}
	c.key, c.client = key, client
	return client, nil
}

// GenerateJSON asks the model for one JSON document conforming to schema.
// The schema is enforced by the API; callers still validate the decoded plan
// because a conforming shape can carry disallowed content.
func (c *Client) GenerateJSON(ctx context.Context, system, user string, schema *genai.Schema) ([]byte, Usage, error) {
	temperature := float32(0.2)
	config := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(system, "system"),
		ResponseMIMEType:  "application/json",
		ResponseSchema:    schema,
		Temperature:       &temperature,
		MaxOutputTokens:   4096,
	}
	contents := []*genai.Content{genai.NewContentFromText(user, "user")}

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		data, usage, err := c.attempt(ctx, contents, config)
		if err == nil {
			return data, usage, nil
		}
		lastErr = err
		if !retryable(err) || attempt == maxAttempts {
			break
		}
		backoff := time.Duration(attempt) * time.Second
		select {
		case <-ctx.Done():
			return nil, Usage{}, fmt.Errorf("gemini: cancelled while backing off: %w", ctx.Err())
		case <-time.After(backoff):
		}
	}
	return nil, Usage{}, lastErr
}

func (c *Client) attempt(ctx context.Context, contents []*genai.Content, config *genai.GenerateContentConfig) ([]byte, Usage, error) {
	attemptCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	sdk, err := c.sdk(ctx)
	if err != nil {
		return nil, Usage{}, err
	}
	resp, err := sdk.Models.GenerateContent(attemptCtx, c.model, contents, config)
	if err != nil {
		return nil, Usage{}, wrapError(err)
	}
	text := strings.TrimSpace(resp.Text())
	if text == "" {
		return nil, Usage{}, errors.New("gemini: empty response")
	}
	var usage Usage
	if resp.UsageMetadata != nil {
		usage = Usage{
			PromptTokens:     resp.UsageMetadata.PromptTokenCount,
			CandidatesTokens: resp.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      resp.UsageMetadata.TotalTokenCount,
		}
	}
	return []byte(text), usage, nil
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
