package config

import "testing"

func setEnv(t *testing.T, values map[string]string) {
	t.Helper()
	for _, key := range []string{"PORT", "APP_ENV", "LOG_LEVEL", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_JWT_SECRET", "WEBSOCKET_ALLOWED_ORIGINS", "SHUTDOWN_TIMEOUT"} {
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
