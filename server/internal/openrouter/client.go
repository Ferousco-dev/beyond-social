// Package openrouter calls language models through OpenRouter, which fronts
// many providers behind one OpenAI-compatible API and one key.
package openrouter

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"google.golang.org/genai"
)

const (
	providerName   = "openrouter"
	DefaultBaseURL = "https://openrouter.ai/api/v1"
	defaultTimeout = 60 * time.Second
	maxOutput      = 4096
	maxBody        = 1 << 20
	appTitle       = "Beyond Social"
)

type Config struct {
	KeyFunc provider.KeyFunc
	BaseURL string
	// Referer names the app to OpenRouter, which shows it on their rankings.
	Referer    string
	Timeout    time.Duration
	HTTPClient *http.Client
}

type Client struct {
	key     provider.KeyFunc
	base    string
	referer string
	http    *http.Client
	timeout time.Duration
}

func NewClient(cfg Config) *Client {
	base := strings.TrimRight(cfg.BaseURL, "/")
	if base == "" {
		base = DefaultBaseURL
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{}
	}
	return &Client{key: cfg.KeyFunc, base: base, referer: cfg.Referer, http: client, timeout: timeout}
}

// Configured reports whether a key is available right now.
func (c *Client) Configured(ctx context.Context) bool {
	if c.key == nil {
		return false
	}
	k, err := c.key(ctx)
	return err == nil && k != ""
}

type request struct {
	Model          string         `json:"model"`
	Messages       []message      `json:"messages"`
	ResponseFormat responseFormat `json:"response_format"`
	Provider       map[string]any `json:"provider"`
	Temperature    float64        `json:"temperature"`
	MaxTokens      int            `json:"max_tokens"`
	Usage          map[string]any `json:"usage"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type responseFormat struct {
	Type       string     `json:"type"`
	JSONSchema namedShape `json:"json_schema"`
}

type namedShape struct {
	Name   string         `json:"name"`
	Strict bool           `json:"strict"`
	Schema map[string]any `json:"schema"`
}

type response struct {
	Choices []struct {
		Message struct {
			Content *string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int32 `json:"prompt_tokens"`
		CompletionTokens int32 `json:"completion_tokens"`
		TotalTokens      int32 `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// GenerateJSON asks a model for an answer in the given shape. Models that cannot
// follow a strict schema are refused by OpenRouter itself (require_parameters).
func (c *Client) GenerateJSON(ctx context.Context, model, system, user string, schema *genai.Schema) ([]byte, gemini.Usage, error) {
	key, err := c.key(ctx)
	if err != nil {
		return nil, gemini.Usage{}, err
	}
	body, err := json.Marshal(request{
		Model:          model,
		Messages:       []message{{Role: "system", Content: system}, {Role: "user", Content: user}},
		ResponseFormat: responseFormat{Type: "json_schema", JSONSchema: namedShape{Name: "reply", Strict: true, Schema: jsonSchema(schema)}},
		Provider:       map[string]any{"require_parameters": true},
		Temperature:    0.2,
		MaxTokens:      maxOutput,
		Usage:          map[string]any{"include": true},
	})
	if err != nil {
		return nil, gemini.Usage{}, err
	}

	var lastErr error
	for attempt := 1; attempt <= 2; attempt++ {
		out, usage, err := c.attempt(ctx, key, body)
		if err == nil {
			return out, usage, nil
		}
		lastErr = err
		if !provider.IsTransient(err) {
			break
		}
		select {
		case <-ctx.Done():
			return nil, gemini.Usage{}, ctx.Err()
		case <-time.After(time.Second):
		}
	}
	return nil, gemini.Usage{}, lastErr
}

func (c *Client) attempt(ctx context.Context, key string, body []byte) ([]byte, gemini.Usage, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, gemini.Usage{}, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Title", appTitle)
	if c.referer != "" {
		req.Header.Set("HTTP-Referer", c.referer)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, gemini.Usage{}, &provider.Error{Provider: providerName, Message: "request failed", Transient: errors.Is(err, context.DeadlineExceeded), Err: err}
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	if err != nil {
		return nil, gemini.Usage{}, &provider.Error{Provider: providerName, Message: "could not read the reply", Transient: true, Err: err}
	}
	var parsed response
	_ = json.Unmarshal(raw, &parsed)
	if resp.StatusCode >= 300 {
		detail := "request refused"
		if parsed.Error != nil && parsed.Error.Message != "" {
			detail = parsed.Error.Message
		}
		if len(detail) > 300 {
			detail = detail[:300]
		}
		return nil, gemini.Usage{}, provider.FromHTTPStatus(providerName, resp.StatusCode, detail)
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == nil {
		return nil, gemini.Usage{}, fmt.Errorf("openrouter: empty response")
	}
	content := stripFence(*parsed.Choices[0].Message.Content)
	if content == "" {
		return nil, gemini.Usage{}, fmt.Errorf("openrouter: empty response")
	}
	return []byte(content), gemini.Usage{PromptTokens: parsed.Usage.PromptTokens, CandidatesTokens: parsed.Usage.CompletionTokens, TotalTokens: parsed.Usage.TotalTokens}, nil
}

// stripFence removes a Markdown code fence some models wrap JSON in.
func stripFence(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}
