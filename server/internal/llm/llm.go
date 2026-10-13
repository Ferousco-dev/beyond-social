// Package llm chooses which language model answers a kind of request. Gemini is
// the default; an admin can point a role at any OpenRouter model instead.
package llm

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/openrouter"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"google.golang.org/genai"
)

// The kinds of request an admin can choose a model for.
const (
	RoleChat            = "chat"
	RoleEditorAssistant = "editor_assistant"
	// RolePlanner turns "make me a video" into the steps that build it.
	RolePlanner = "planner"
	// RoleBackup is not a kind of request. It is the OpenRouter model any role
	// falls back to when Gemini cannot answer. Gemini here means no backup.
	RoleBackup = "backup"
)

// Roles lists them with labels, in display order.
var Roles = []struct{ Key, Label string }{
	{RoleChat, "Chat and scripts"},
	{RoleEditorAssistant, "Editor assistant"},
	{RolePlanner, "Video planning"},
	{RoleBackup, "Backup when Gemini cannot answer"},
}

const (
	// GeminiChoice is the stored value for the default model.
	GeminiChoice     = "gemini"
	openRouterPrefix = "openrouter:"
	settingTTL       = 30 * time.Second
)

// SettingKey is where a role's choice is stored.
func SettingKey(role string) string { return "model." + role }

// OpenRouterChoice is the stored value for an OpenRouter model id.
func OpenRouterChoice(modelID string) string { return openRouterPrefix + modelID }

type Settings interface {
	Get(ctx context.Context, key string) (string, bool, error)
}

type Client interface {
	GenerateJSON(ctx context.Context, system, user string, schema *genai.Schema) ([]byte, gemini.Usage, error)
	GenerateJSONFromMedia(ctx context.Context, system, user string, media []gemini.Media, schema *genai.Schema) ([]byte, gemini.Usage, error)
}

// Switch answers one role with whichever model the admin picked. Anything that
// needs to look at a video or listen to audio always goes to Gemini.
type Switch struct {
	role       string
	gemini     Client
	openrouter *openrouter.Client
	settings   Settings

	mu     sync.Mutex
	choice string
	backup string
	at     time.Time
}

func NewSwitch(role string, g Client, or *openrouter.Client, settings Settings) *Switch {
	return &Switch{role: role, gemini: g, openrouter: or, settings: settings}
}

func (s *Switch) selected(ctx context.Context) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if time.Since(s.at) < settingTTL {
		return s.choice
	}
	value, found, err := s.settings.Get(ctx, SettingKey(s.role))
	if err != nil {
		slog.Warn("read model setting", "role", s.role, "error", err)
		return s.choice
	}
	if !found {
		value = GeminiChoice
	}
	// The backup is read with the choice so one lookup serves both.
	if backup, ok, err := s.settings.Get(ctx, SettingKey(RoleBackup)); err == nil && ok {
		s.backup = backup
	} else if err == nil {
		s.backup = GeminiChoice
	}
	s.choice, s.at = value, time.Now()
	return value
}

// backupModel is the OpenRouter model to fall back to, if the admin chose one.
func (s *Switch) backupModel() (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	model, ok := strings.CutPrefix(s.backup, openRouterPrefix)
	return model, ok && model != ""
}

// shouldFallBack says whether another model might do better. A request the
// provider refused as bad would be refused again, so only a key, credit, an
// outage or an unknown failure is worth a second try.
func shouldFallBack(err error) bool {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	return provider.Classify(err) != provider.ClassRejected
}

func (s *Switch) GenerateJSON(ctx context.Context, system, user string, schema *genai.Schema) ([]byte, gemini.Usage, error) {
	choice := s.selected(ctx)
	model, ok := strings.CutPrefix(choice, openRouterPrefix)
	if !ok || s.openrouter == nil {
		out, usage, err := s.gemini.GenerateJSON(ctx, system, user, schema)
		if err == nil || s.openrouter == nil || !shouldFallBack(err) {
			return out, usage, err
		}
		backup, has := s.backupModel()
		if !has {
			return out, usage, err
		}
		slog.Warn("gemini could not answer, using the backup model", "role", s.role, "model", backup, "error", err)
		return s.openrouter.GenerateJSON(ctx, backup, system, user, schema)
	}
	out, usage, err := s.openrouter.GenerateJSON(ctx, model, system, user, schema)
	if err != nil && provider.Code(err) == provider.CodeNotConfigured {
		// An admin picked an OpenRouter model but the key is not in yet: keep the product working.
		slog.Warn("openrouter key missing, using gemini", "role", s.role)
		return s.gemini.GenerateJSON(ctx, system, user, schema)
	}
	if err != nil && !errors.Is(err, context.Canceled) {
		slog.Error("openrouter request failed", "role", s.role, "model", model, "error", err)
	}
	return out, usage, err
}

func (s *Switch) GenerateJSONFromMedia(ctx context.Context, system, user string, media []gemini.Media, schema *genai.Schema) ([]byte, gemini.Usage, error) {
	return s.gemini.GenerateJSONFromMedia(ctx, system, user, media, schema)
}

// Forget makes the next request read the setting again, so a change applies at once.
func (s *Switch) Forget() {
	s.mu.Lock()
	s.at = time.Time{}
	s.mu.Unlock()
}
