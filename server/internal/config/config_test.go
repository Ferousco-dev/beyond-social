package config

import "testing"

func setEnv(t *testing.T, values map[string]string) {
	t.Helper()
	// Provider credentials are required everywhere; tests opt out explicitly.
	if _, skip := values["NO_PROVIDER_KEYS"]; !skip {
		values = withProviderKeys(values)
	}
	for _, key := range []string{"PORT", "APP_ENV", "LOG_LEVEL", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_JWT_SECRET", "WEBSOCKET_ALLOWED_ORIGINS", "SHUTDOWN_TIMEOUT", "APIFY_API_TOKEN", "KIE_API_KEY", "KIE_WEBHOOK_HMAC_KEY", "PUBLIC_BASE_URL", "HEYGEN_API_KEY", "HEYGEN_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GEMINI_MODEL"} {
		t.Setenv(key, values[key])
	}
}

func TestLoadFromEnvDevelopmentDefaults(t *testing.T) {
	setEnv(t, map[string]string{"SUPABASE_URL": "https://abc.supabase.co/"})

	cfg, err := LoadFromEnv()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.HTTPPort != "8080" || cfg.DatabaseURL != defaultDevDatabaseURL {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
	if cfg.Issuer() != "https://abc.supabase.co/auth/v1" {
		t.Fatalf("unexpected issuer %q", cfg.Issuer())
	}
	if cfg.JWKSURL() != "https://abc.supabase.co/auth/v1/.well-known/jwks.json" {
		t.Fatalf("unexpected JWKS URL %q", cfg.JWKSURL())
	}
}

func TestLoadFromEnvRejectsInvalidConfig(t *testing.T) {
	cases := map[string]map[string]string{
		"missing supabase url":    {},
		"relative supabase url":   {"SUPABASE_URL": "abc.supabase.co"},
		"bad port":                {"SUPABASE_URL": "https://a.co", "PORT": "99999"},
		"bad env":                 {"SUPABASE_URL": "https://a.co", "APP_ENV": "staging"},
		"wildcard origin":         {"SUPABASE_URL": "https://a.co", "WEBSOCKET_ALLOWED_ORIGINS": "*"},
		"origin with path":        {"SUPABASE_URL": "https://a.co", "WEBSOCKET_ALLOWED_ORIGINS": "https://a.co/app"},
		"prod without database":   {"SUPABASE_URL": "https://a.co", "APP_ENV": "production", "WEBSOCKET_ALLOWED_ORIGINS": "https://a.co"},
		"prod without origins":    {"SUPABASE_URL": "https://a.co", "APP_ENV": "production", "DATABASE_URL": "postgres://x"},
		"prod with http supabase": {"SUPABASE_URL": "http://a.co", "APP_ENV": "production", "DATABASE_URL": "postgres://x", "WEBSOCKET_ALLOWED_ORIGINS": "https://a.co"},
		"bad shutdown timeout":    {"SUPABASE_URL": "https://a.co", "SHUTDOWN_TIMEOUT": "soon"},
	}
	for name, env := range cases {
		t.Run(name, func(t *testing.T) {
			setEnv(t, env)
			if _, err := LoadFromEnv(); err == nil {
				t.Fatal("expected configuration error")
			}
		})
	}
}

func TestLoadFromEnvParsesOrigins(t *testing.T) {
	setEnv(t, map[string]string{
		"SUPABASE_URL":              "https://a.co",
		"WEBSOCKET_ALLOWED_ORIGINS": "http://localhost:3000/, https://app.example.com",
	})
	cfg, err := LoadFromEnv()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.AllowedOrigins) != 2 || cfg.AllowedOrigins[0] != "http://localhost:3000" {
		t.Fatalf("unexpected origins %v", cfg.AllowedOrigins)
	}
}

func withProviderKeys(values map[string]string) map[string]string {
	out := map[string]string{"APIFY_API_TOKEN": "apify-test", "KIE_API_KEY": "kie-test", "HEYGEN_API_KEY": "heygen-test", "SUPABASE_SERVICE_ROLE_KEY": "service-test", "GEMINI_API_KEY": "gemini-test"}
	for k, v := range values {
		out[k] = v
	}
	return out
}

func TestLoadFromEnvRequiresProviderCredentials(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"no apify token":      {"SUPABASE_URL": "https://a.co", "KIE_API_KEY": "k", "NO_PROVIDER_KEYS": "1"},
		"no kie key":          {"SUPABASE_URL": "https://a.co", "APIFY_API_TOKEN": "t", "NO_PROVIDER_KEYS": "1"},
		"no heygen key":       {"SUPABASE_URL": "https://a.co", "APIFY_API_TOKEN": "t", "KIE_API_KEY": "k", "SUPABASE_SERVICE_ROLE_KEY": "s", "NO_PROVIDER_KEYS": "1"},
		"no service role key": {"SUPABASE_URL": "https://a.co", "APIFY_API_TOKEN": "t", "KIE_API_KEY": "k", "HEYGEN_API_KEY": "h", "NO_PROVIDER_KEYS": "1"},
		"no gemini key":       {"SUPABASE_URL": "https://a.co", "APIFY_API_TOKEN": "t", "KIE_API_KEY": "k", "HEYGEN_API_KEY": "h", "SUPABASE_SERVICE_ROLE_KEY": "s", "NO_PROVIDER_KEYS": "1"},
	} {
		t.Run(name, func(t *testing.T) {
			setEnv(t, env)
			if _, err := LoadFromEnv(); err == nil {
				t.Fatal("expected a missing credential error")
			}
		})
	}
}

func TestKIECallbackURL(t *testing.T) {
	setEnv(t, map[string]string{"SUPABASE_URL": "https://a.co"})
	cfg, err := LoadFromEnv()
	if err != nil || cfg.KIECallbackURL() != "" {
		t.Fatalf("callbacks must be off without PUBLIC_BASE_URL: %q %v", cfg.KIECallbackURL(), err)
	}
	setEnv(t, map[string]string{"SUPABASE_URL": "https://a.co", "PUBLIC_BASE_URL": "https://api.example.com/"})
	cfg, err = LoadFromEnv()
	if err != nil || cfg.KIECallbackURL() != "https://api.example.com/api/v1/callbacks/kie" {
		t.Fatalf("unexpected callback url %q %v", cfg.KIECallbackURL(), err)
	}
	setEnv(t, map[string]string{"SUPABASE_URL": "https://a.co", "PUBLIC_BASE_URL": "not-a-url"})
	if _, err := LoadFromEnv(); err == nil {
		t.Fatal("expected invalid PUBLIC_BASE_URL to be rejected")
	}
}

func TestHeygenCallbackURL(t *testing.T) {
	setEnv(t, map[string]string{"SUPABASE_URL": "https://a.co"})
	cfg, _ := LoadFromEnv()
	if cfg.HeygenCallbackURL() != "" {
		t.Fatal("callbacks must be off without PUBLIC_BASE_URL")
	}
	setEnv(t, map[string]string{"SUPABASE_URL": "https://a.co", "PUBLIC_BASE_URL": "https://api.example.com/"})
	cfg, _ = LoadFromEnv()
	if cfg.HeygenCallbackURL() != "https://api.example.com/api/v1/callbacks/heygen" {
		t.Fatalf("got %q", cfg.HeygenCallbackURL())
	}
}
