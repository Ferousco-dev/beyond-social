package openrouter

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"
)

const catalogTTL = 30 * time.Minute

// Model is one model an admin can choose.
type Model struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	ContextLength int     `json:"context_length"`
	InputPerM     float64 `json:"input_per_million"`
	OutputPerM    float64 `json:"output_per_million"`
}

type catalog struct {
	mu     sync.Mutex
	models []Model
	at     time.Time
}

var models catalog

// Models lists the models that can answer in a strict JSON shape, which is how
// the product asks everything. The list is public, so no key is needed, and is
// kept for half an hour.
func (c *Client) Models(ctx context.Context) ([]Model, error) {
	models.mu.Lock()
	defer models.mu.Unlock()
	if len(models.models) > 0 && time.Since(models.at) < catalogTTL {
		return models.models, nil
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+"/models", nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openrouter: list models: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("openrouter: list models: status %d", resp.StatusCode)
	}
	var body struct {
		Data []struct {
			ID            string `json:"id"`
			Name          string `json:"name"`
			ContextLength int    `json:"context_length"`
			Pricing       struct {
				Prompt     string `json:"prompt"`
				Completion string `json:"completion"`
			} `json:"pricing"`
			Supported []string `json:"supported_parameters"`
		} `json:"data"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(nil, resp.Body, 16<<20)).Decode(&body); err != nil {
		return nil, fmt.Errorf("openrouter: decode models: %w", err)
	}
	out := make([]Model, 0, len(body.Data))
	for _, m := range body.Data {
		if !contains(m.Supported, "structured_outputs") {
			continue
		}
		out = append(out, Model{ID: m.ID, Name: m.Name, ContextLength: m.ContextLength, InputPerM: perMillion(m.Pricing.Prompt), OutputPerM: perMillion(m.Pricing.Completion)})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	models.models, models.at = out, time.Now()
	return out, nil
}

func contains(list []string, want string) bool {
	for _, s := range list {
		if s == want {
			return true
		}
	}
	return false
}

// perMillion turns OpenRouter's price per token (a string) into dollars per million tokens.
func perMillion(perToken string) float64 {
	v, err := strconv.ParseFloat(perToken, 64)
	if err != nil || v < 0 {
		return 0
	}
	return v * 1e6
}
