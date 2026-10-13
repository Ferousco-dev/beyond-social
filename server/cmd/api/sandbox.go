package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/config"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/providers"
	"github.com/Ferousco-dev/beyond-social/server/internal/sandbox"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

// sandboxHooks points every outside service at the local sandbox. A nil value
// passes everything through untouched, so main reads the same either way. This
// file, cmd/sandbox and internal/sandbox are all removed once testing is done.
type sandboxHooks struct{ base string }

func newSandboxHooks(cfg config.Config) (*sandboxHooks, error) {
	if cfg.SandboxURL == "" {
		return nil, nil
	}
	pem, err := os.ReadFile(cfg.SandboxCAFile)
	if err != nil {
		return nil, err
	}
	sandbox.Trust(pem)
	slog.Warn("SANDBOX MODE: no outside service is being called", "sandbox", cfg.SandboxURL)
	return &sandboxHooks{base: cfg.SandboxURL}, nil
}

// keys fills any key that is not set with a placeholder, so nothing has to be
// pasted into the console just to try the product.
func (s *sandboxHooks) keys(env map[string]string) {
	if s == nil {
		return
	}
	for _, name := range []string{
		secrets.NameApify, secrets.NameKIE, secrets.NameHeygen, secrets.NameGemini, secrets.NameOpenRouter, secrets.NameStripeKey,
		secrets.NameYouTubeClientID, secrets.NameYouTubeClientSecret, secrets.NameTikTokClientKey, secrets.NameTikTokClientSecret,
		secrets.NameMetaAppID, secrets.NameMetaAppSecret,
	} {
		if env[name] == "" {
			env[name] = "sandbox-" + name
		}
	}
	if env[secrets.NameStripeWebhook] == "" {
		env[secrets.NameStripeWebhook] = "whsec_sandbox"
	}
}

func (s *sandboxHooks) apify(c *apify.Client) *apify.Client {
	if s == nil {
		return c
	}
	return c.WithBaseURL(s.base + "/apify")
}

func (s *sandboxHooks) kie(c *kie.Client) *kie.Client {
	if s == nil {
		return c
	}
	return c.WithBaseURLs(s.base+"/kie", s.base+"/kie")
}

func (s *sandboxHooks) heygen(c *heygen.Client) *heygen.Client {
	if s == nil {
		return c
	}
	return c.WithBaseURL(s.base + "/heygen")
}

func (s *sandboxHooks) stripe(c *billing.Stripe) *billing.Stripe {
	if s == nil {
		return c
	}
	return c.WithBase(s.base+"/stripe", nil)
}

func (s *sandboxHooks) geminiHTTP() *http.Client {
	if s == nil {
		return nil
	}
	return sandbox.Client(s.base)
}

func (s *sandboxHooks) social(y *social.YouTubeProvider, t *social.TikTokProvider, i *social.InstagramProvider) (*social.YouTubeProvider, *social.TikTokProvider, *social.InstagramProvider) {
	if s == nil {
		return y, t, i
	}
	return y.Redirect(s.base), t.Redirect(s.base), i.Redirect(s.base)
}

func (s *sandboxHooks) checker(c *providers.Checker) *providers.Checker {
	if s == nil {
		return c
	}
	c.ApifyBase, c.KIEBase, c.HeygenBase = s.base+"/apify", s.base+"/kie", s.base+"/heygen"
	c.Gemini, c.OpenRouterBase, c.StripeBase = s.base+"/gemini/v1beta", s.base+"/openrouter", s.base+"/stripe"
	return c
}
