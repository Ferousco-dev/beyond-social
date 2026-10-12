package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
)

const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
)

const defaultDevDatabaseURL = "postgres://postgres:postgres@127.0.0.1:54322/postgres"

type Config struct {
	HTTPPort    string
	Environment string
	LogLevel    string
	DatabaseURL string

	SupabaseURL string
	// SupabaseJWTSecret is only needed for projects still on the legacy shared
	// HS256 secret. Projects on asymmetric signing keys are verified via JWKS.
	SupabaseJWTSecret string

	APIFYToken string
	KIEAPIKey  string
	// KIEWebhookHMACKey verifies callback signatures. Optional: without it
	// callbacks are treated as hints only and the API is always re-queried.
	KIEWebhookHMACKey string
	// PublicBaseURL is where KIE can reach this service. Optional: without it
	// no callback URL is sent and progress is tracked by polling alone.
	PublicBaseURL       string
	APIFYTikTokActor    string
	APIFYInstagramActor string

	HeygenAPIKey string
	// HeygenWebhookSecret verifies webhook signatures. Optional: without it
	// callbacks are treated as hints and the video is always re-read from HeyGen.
	HeygenWebhookSecret string
	// SupabaseServiceRoleKey lets the service hand a private recording to HeyGen
	// through a signed URL and delete it afterwards. Server-side only.
	SupabaseServiceRoleKey string

	// GeminiAPIKey authenticates workflow planning. Server-side only: the key
	// must never reach the browser.
	GeminiAPIKey string
	// GeminiModel overrides the default planning model.
	GeminiModel string

	AllowedOrigins  []string
	ShutdownTimeout time.Duration
}

// HeygenCallbackURL is the URL given to HeyGen, or empty when callbacks are disabled.
func (c Config) HeygenCallbackURL() string {
	if c.PublicBaseURL == "" {
		return ""
	}
	return c.PublicBaseURL + "/api/v1/callbacks/heygen"
}

// KIECallbackURL is the URL given to KIE, or empty when callbacks are disabled.
func (c Config) KIECallbackURL() string {
	if c.PublicBaseURL == "" {
		return ""
	}
	return c.PublicBaseURL + "/api/v1/callbacks/kie"
}

func (c Config) IsProduction() bool { return c.Environment == EnvProduction }

// Issuer is the `iss` claim Supabase Auth stamps on every access token.
func (c Config) Issuer() string { return c.SupabaseURL + "/auth/v1" }

// JWKSURL is where Supabase publishes the project's public signing keys.
func (c Config) JWKSURL() string { return c.Issuer() + "/.well-known/jwks.json" }

func LoadFromEnv() (Config, error) {
	cfg := Config{
		HTTPPort:          getenvDefault("PORT", "8080"),
		Environment:       strings.ToLower(getenvDefault("APP_ENV", EnvDevelopment)),
		LogLevel:          getenvDefault("LOG_LEVEL", "info"),
		DatabaseURL:       strings.TrimSpace(os.Getenv("DATABASE_URL")),
		SupabaseURL:       strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/"),
		SupabaseJWTSecret: strings.TrimSpace(os.Getenv("SUPABASE_JWT_SECRET")),
		AllowedOrigins:    splitList(os.Getenv("WEBSOCKET_ALLOWED_ORIGINS")),

		APIFYToken:          strings.TrimSpace(os.Getenv("APIFY_API_TOKEN")),
		KIEAPIKey:           strings.TrimSpace(os.Getenv("KIE_API_KEY")),
		KIEWebhookHMACKey:   strings.TrimSpace(os.Getenv("KIE_WEBHOOK_HMAC_KEY")),
		PublicBaseURL:       strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_BASE_URL")), "/"),
		APIFYTikTokActor:    strings.TrimSpace(os.Getenv("APIFY_TIKTOK_ACTOR")),
		APIFYInstagramActor: strings.TrimSpace(os.Getenv("APIFY_INSTAGRAM_ACTOR")),

		HeygenAPIKey:           strings.TrimSpace(os.Getenv("HEYGEN_API_KEY")),
		HeygenWebhookSecret:    strings.TrimSpace(os.Getenv("HEYGEN_WEBHOOK_SECRET")),
		SupabaseServiceRoleKey: strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_ROLE_KEY")),

		GeminiAPIKey: strings.TrimSpace(os.Getenv("GEMINI_API_KEY")),
		GeminiModel:  strings.TrimSpace(os.Getenv("GEMINI_MODEL")),
	}

	if cfg.Environment != EnvDevelopment && cfg.Environment != EnvProduction {
		return Config{}, fmt.Errorf("APP_ENV must be %q or %q", EnvDevelopment, EnvProduction)
	}
	if port, err := strconv.Atoi(cfg.HTTPPort); err != nil || port < 1 || port > 65535 {
		return Config{}, errors.New("PORT must be an integer between 1 and 65535")
	}

	if cfg.SupabaseURL == "" {
		return Config{}, errors.New("SUPABASE_URL is required")
	}
	parsed, err := url.Parse(cfg.SupabaseURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return Config{}, errors.New("SUPABASE_URL must be an absolute http(s) URL")
	}
	if cfg.IsProduction() && parsed.Scheme != "https" {
		return Config{}, errors.New("SUPABASE_URL must use https in production")
	}

	if cfg.APIFYToken == "" {
		return Config{}, errors.New("APIFY_API_TOKEN is required")
	}
	if cfg.KIEAPIKey == "" {
		return Config{}, errors.New("KIE_API_KEY is required")
	}
	if cfg.HeygenAPIKey == "" {
		return Config{}, errors.New("HEYGEN_API_KEY is required")
	}
	if cfg.SupabaseServiceRoleKey == "" {
		return Config{}, errors.New("SUPABASE_SERVICE_ROLE_KEY is required")
	}
	if cfg.GeminiAPIKey == "" {
		return Config{}, errors.New("GEMINI_API_KEY is required")
	}
	if cfg.GeminiModel == "" {
		cfg.GeminiModel = gemini.DefaultModel
	}
	if err := validatePublicURL(cfg); err != nil {
		return Config{}, err
	}

	if cfg.DatabaseURL == "" {
		if cfg.IsProduction() {
			return Config{}, errors.New("DATABASE_URL is required in production")
		}
		cfg.DatabaseURL = defaultDevDatabaseURL
	}

	if err := validateOrigins(cfg); err != nil {
		return Config{}, err
	}

	timeout, err := time.ParseDuration(getenvDefault("SHUTDOWN_TIMEOUT", "15s"))
	if err != nil || timeout <= 0 {
		return Config{}, errors.New("SHUTDOWN_TIMEOUT must be a positive duration such as 15s")
	}
	cfg.ShutdownTimeout = timeout

	return cfg, nil
}

func validatePublicURL(cfg Config) error {
	if cfg.PublicBaseURL == "" {
		return nil
	}
	u, err := url.Parse(cfg.PublicBaseURL)
	if err != nil || u.Host == "" || (u.Scheme != "https" && !(u.Scheme == "http" && !cfg.IsProduction())) {
		return errors.New("PUBLIC_BASE_URL must be an absolute https URL")
	}
	return nil
}

func validateOrigins(cfg Config) error {
	if cfg.IsProduction() && len(cfg.AllowedOrigins) == 0 {
		return errors.New("WEBSOCKET_ALLOWED_ORIGINS is required in production")
	}
	for _, origin := range cfg.AllowedOrigins {
		if origin == "*" {
			return errors.New("WEBSOCKET_ALLOWED_ORIGINS must list explicit origins, not *")
		}
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" || parsed.Path != "" {
			return fmt.Errorf("WEBSOCKET_ALLOWED_ORIGINS entry %q must look like https://example.com", origin)
		}
	}
	return nil
}

func splitList(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if trimmed := strings.TrimRight(strings.TrimSpace(part), "/"); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func getenvDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
