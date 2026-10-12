package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
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

	AllowedOrigins  []string
	ShutdownTimeout time.Duration
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
