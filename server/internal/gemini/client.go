package gemini

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
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
	APIKey string
	// Empty selects DefaultModel.
	Model string
	// Empty selects DefaultTimeout. Applies per attempt.
	Timeout time.Duration
	// Nil selects the default client. Tests inject a stub transport here.
	HTTPClient *http.Client
}

type Client struct {
	client  *genai.Client
	model   string
	timeout time.Duration
}

// Usage mirrors the token counts Gemini reports, for spend guardrails.
type Usage struct {
	PromptTokens     int32
	CandidatesTokens int32
	TotalTokens      int32
}

func NewClient(cfg Config) (*Client, error) {
	if strings.TrimSpace(cfg.APIKey) == "" {
		return nil, errors.New("gemini: API key is required")
	}
	model := cfg.Model
	if model == "" {
		model = DefaultModel
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:     cfg.APIKey,
		Backend:    genai.BackendGeminiAPI,
		HTTPClient: cfg.HTTPClient,
	})
	if err != nil {
		return nil, fmt.Errorf("gemini: create client: %w", err)
	}
	return &Client{client: client, model: model, timeout: timeout}, nil
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

	resp, err := c.client.Models.GenerateContent(attemptCtx, c.model, contents, config)
	if err != nil {
		return nil, Usage{}, fmt.Errorf("gemini: generate content: %w", err)
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

// retryable covers rate limits and transient server failures. Anything else,
// including auth and bad-request errors, returns immediately. The SDK reports
// failures as an APIError value, not a pointer.
func retryable(err error) bool {
	var apiErr genai.APIError
	if !errors.As(err, &apiErr) {
		return false
	}
	switch apiErr.Code {
	case http.StatusTooManyRequests,
		http.StatusInternalServerError,
		http.StatusBadGateway,
		http.StatusServiceUnavailable,
		http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}
