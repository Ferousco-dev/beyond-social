// Package providers makes read-only calls that prove a provider key works and,
// where the provider exposes it, report what is left on the account. Neither
// call spends credits.
package providers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

// Balance is what remains on a provider account.
type Balance struct {
	Provider string  `json:"provider"`
	Amount   float64 `json:"amount"`
	Unit     string  `json:"unit"` // "credits" or "usd"
}

// ErrNoBalance means the provider does not report a balance.
var ErrNoBalance = errors.New("providers: no balance endpoint")

type Checker struct {
	HTTP                                                               *http.Client
	ApifyBase, KIEBase, HeygenBase, Gemini, OpenRouterBase, StripeBase string
	// Hook posts to the admin's alert webhook, and refuses private addresses.
	Hook *http.Client
}

func NewChecker() *Checker {
	return &Checker{
		HTTP:           &http.Client{Timeout: 15 * time.Second},
		ApifyBase:      "https://api.apify.com/v2",
		KIEBase:        "https://api.kie.ai",
		HeygenBase:     "https://api.heygen.com/v3",
		Gemini:         "https://generativelanguage.googleapis.com/v1beta",
		OpenRouterBase: "https://openrouter.ai/api/v1",
		StripeBase:     "https://api.stripe.com/v1",
		Hook:           safenet.NewClient(10 * time.Second),
	}
}

// Verify proves a key is accepted. Names with nothing to test (webhook secrets)
// always pass. The error never contains the key.
func (c *Checker) Verify(ctx context.Context, name, value string) error {
	switch name {
	case secrets.NameApify:
		_, err := c.get(ctx, c.ApifyBase+"/users/me", bearer(value))
		return err
	case secrets.NameKIE:
		_, err := c.kieCredits(ctx, value)
		return err
	case secrets.NameHeygen:
		_, err := c.get(ctx, c.HeygenBase+"/users/me", header("X-Api-Key", value))
		return err
	case secrets.NameAlertWebhook:
		// Posting a test line is the only way to know the address reaches someone.
		if u, err := url.Parse(value); err != nil || u.Scheme != "https" || u.Host == "" {
			return errors.New("the webhook must be an https address")
		}
		return alerts.PostText(ctx, c.Hook, value, "Beyond Social: alerts are connected. You will be told here when a provider runs low or a key breaks.")
	case secrets.NameStripeKey:
		// A restricted or secret key can read the balance; a publishable one cannot, which is the mistake to catch.
		_, err := c.get(ctx, c.StripeBase+"/balance", bearer(value))
		return err
	case secrets.NameOpenRouter:
		// Reads the key's own record, which rejects a bad key without spending anything.
		_, err := c.get(ctx, c.OpenRouterBase+"/auth/key", bearer(value))
		return err
	case secrets.NameGemini:
		// Listing models succeeds for a key whose project is denied generation, so
		// the check asks for one token of output instead.
		_, err := c.do(ctx, http.MethodPost, c.Gemini+"/models/"+gemini.DefaultModel+":generateContent",
			`{"contents":[{"parts":[{"text":"ping"}]}],"generationConfig":{"maxOutputTokens":1}}`, header("x-goog-api-key", value))
		return err
	}
	return nil
}

// Balance reads the remaining balance, or ErrNoBalance.
func (c *Checker) Balance(ctx context.Context, name, value string) (Balance, error) {
	switch name {
	case secrets.NameKIE:
		credits, err := c.kieCredits(ctx, value)
		return Balance{Provider: name, Amount: credits, Unit: "credits"}, err
	case secrets.NameHeygen:
		body, err := c.get(ctx, c.HeygenBase+"/users/me", header("X-Api-Key", value))
		if err != nil {
			return Balance{}, err
		}
		var r struct {
			Data struct {
				Wallet *struct {
					Remaining float64 `json:"remaining_balance"`
				} `json:"wallet"`
			} `json:"data"`
		}
		if json.Unmarshal(body, &r) != nil || r.Data.Wallet == nil {
			return Balance{}, ErrNoBalance
		}
		return Balance{Provider: name, Amount: r.Data.Wallet.Remaining, Unit: "usd"}, nil
	case secrets.NameApify:
		body, err := c.get(ctx, c.ApifyBase+"/users/me/limits", bearer(value))
		if err != nil {
			return Balance{}, err
		}
		var r struct {
			Data struct {
				Limits struct {
					Max float64 `json:"maxMonthlyUsageUsd"`
				} `json:"limits"`
				Current struct {
					Used float64 `json:"monthlyUsageUsd"`
				} `json:"current"`
			} `json:"data"`
		}
		if json.Unmarshal(body, &r) != nil || r.Data.Limits.Max == 0 {
			return Balance{}, ErrNoBalance
		}
		return Balance{Provider: name, Amount: r.Data.Limits.Max - r.Data.Current.Used, Unit: "usd"}, nil
	}
	return Balance{}, ErrNoBalance
}

func (c *Checker) kieCredits(ctx context.Context, key string) (float64, error) {
	body, err := c.get(ctx, c.KIEBase+"/api/v1/chat/credit", bearer(key))
	if err != nil {
		return 0, err
	}
	var r struct {
		Code int     `json:"code"`
		Msg  string  `json:"msg"`
		Data float64 `json:"data"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return 0, errors.New("kie returned an unreadable response")
	}
	// KIE reports failures in the body with a 200 status.
	if r.Code != 200 {
		return 0, fmt.Errorf("kie rejected the key: %s", r.Msg)
	}
	return r.Data, nil
}

func bearer(key string) func(*http.Request)  { return header("Authorization", "Bearer "+key) }
func header(k, v string) func(*http.Request) { return func(r *http.Request) { r.Header.Set(k, v) } }

func (c *Checker) get(ctx context.Context, url string, auth func(*http.Request)) ([]byte, error) {
	return c.do(ctx, http.MethodGet, url, "", auth)
}

func (c *Checker) do(ctx context.Context, method, url, body string, auth func(*http.Request)) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	auth(req)
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, errors.New("the provider could not be reached")
	}
	defer resp.Body.Close()
	answer, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return nil, errors.New("the provider rejected this key" + reasonOf(answer))
	case resp.StatusCode >= 300:
		return nil, fmt.Errorf("the provider answered %d%s", resp.StatusCode, reasonOf(answer))
	}
	return []byte(strings.TrimSpace(string(answer))), nil
}

// code matches the shouting-snake names providers use for a reason, such as
// PERMISSION_DENIED or API_KEY_INVALID. Free text is never passed on, so an
// error that echoes part of a key cannot leak it.
var code = regexp.MustCompile(`^[A-Z][A-Z0-9_]{2,47}$`)

// reasonOf reads why a provider refused a request, in the shape Google's APIs
// use ({"error":{"status":...,"details":[{"reason":...}]}}), as " (REASON)".
func reasonOf(body []byte) string {
	var e struct {
		Error struct {
			Status  string `json:"status"`
			Details []struct {
				Reason string `json:"reason"`
			} `json:"details"`
		} `json:"error"`
	}
	if json.Unmarshal(body, &e) != nil {
		return ""
	}
	candidates := []string{e.Error.Status}
	for _, d := range e.Error.Details {
		candidates = append(candidates, d.Reason)
	}
	var found []string
	for _, c := range candidates {
		if code.MatchString(c) && !slices.Contains(found, c) {
			found = append(found, c)
		}
	}
	if len(found) == 0 {
		return ""
	}
	return " (" + strings.Join(found, ", ") + ")"
}
