package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/llm"
	"github.com/Ferousco-dev/beyond-social/server/internal/openrouter"
)

// ModelAdmin is what the admin model page needs.
type ModelAdmin interface {
	Current(ctx context.Context) (map[string]string, error)
	Choose(ctx context.Context, role, choice, actor string) error
	Catalog(ctx context.Context) ([]openrouter.Model, error)
	OpenRouterConfigured(ctx context.Context) bool
}

func (a *App) listModels(w http.ResponseWriter, r *http.Request) {
	current, err := a.deps.Models.Current(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	type role struct {
		Key   string `json:"key"`
		Label string `json:"label"`
		Model string `json:"model"`
	}
	roles := make([]role, 0, len(llm.Roles))
	for _, ro := range llm.Roles {
		roles = append(roles, role{Key: ro.Key, Label: ro.Label, Model: current[ro.Key]})
	}
	configured := a.deps.Models.OpenRouterConfigured(r.Context())
	// The catalog is public but only useful once the key is in, so it is not fetched before.
	catalog := []openrouter.Model{}
	if configured {
		if models, err := a.deps.Models.Catalog(r.Context()); err == nil {
			catalog = models
		}
	}
	writeData(w, http.StatusOK, map[string]any{"roles": roles, "openrouter_configured": configured, "catalog": catalog})
}

func (a *App) chooseModel(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Model string `json:"model"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	role := r.PathValue("role")
	switch err := a.deps.Models.Choose(r.Context(), role, req.Model, identity.UserID); {
	case errors.Is(err, llm.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case err != nil:
		writeInternal(w, r, err)
	default:
		a.audit(r, identity.UserID, "model.choose", role, map[string]any{"model": req.Model})
		w.WriteHeader(http.StatusNoContent)
	}
}
