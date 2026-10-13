package llm

import (
	"context"
	"errors"
	"fmt"

	"github.com/Ferousco-dev/beyond-social/server/internal/openrouter"
)

var ErrInvalid = errors.New("llm: invalid model choice")

type SettingsWriter interface {
	Settings
	Set(ctx context.Context, key, value, actor string) error
}

// Admin lets the console read and change which model answers each role.
type Admin struct {
	settings   SettingsWriter
	openrouter *openrouter.Client
	switches   []*Switch
}

func NewAdmin(settings SettingsWriter, or *openrouter.Client, switches ...*Switch) *Admin {
	return &Admin{settings: settings, openrouter: or, switches: switches}
}

// Current returns the choice for every role, Gemini where none has been made.
func (a *Admin) Current(ctx context.Context) (map[string]string, error) {
	out := make(map[string]string, len(Roles))
	for _, role := range Roles {
		value, found, err := a.settings.Get(ctx, SettingKey(role.Key))
		if err != nil {
			return nil, err
		}
		if !found {
			value = GeminiChoice
		}
		out[role.Key] = value
	}
	return out, nil
}

func (a *Admin) Catalog(ctx context.Context) ([]openrouter.Model, error) {
	return a.openrouter.Models(ctx)
}

func (a *Admin) OpenRouterConfigured(ctx context.Context) bool { return a.openrouter.Configured(ctx) }

// Choose sets the model for a role. An OpenRouter choice must be a model the
// catalog lists, so a typo cannot take chat down.
func (a *Admin) Choose(ctx context.Context, role, choice, actor string) error {
	known := false
	for _, r := range Roles {
		known = known || r.Key == role
	}
	if !known {
		return fmt.Errorf("%w: unknown role", ErrInvalid)
	}
	if choice != GeminiChoice {
		id, ok := cutPrefix(choice, openRouterPrefix)
		if !ok {
			return fmt.Errorf("%w: choose gemini or an openrouter model", ErrInvalid)
		}
		models, err := a.openrouter.Models(ctx)
		if err != nil {
			return err
		}
		found := false
		for _, m := range models {
			found = found || m.ID == id
		}
		if !found {
			return fmt.Errorf("%w: that model is not available", ErrInvalid)
		}
	}
	if err := a.settings.Set(ctx, SettingKey(role), choice, actor); err != nil {
		return err
	}
	for _, s := range a.switches {
		s.Forget()
	}
	return nil
}

func cutPrefix(s, prefix string) (string, bool) {
	if len(s) > len(prefix) && s[:len(prefix)] == prefix {
		return s[len(prefix):], true
	}
	return "", false
}
