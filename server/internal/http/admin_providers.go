package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

// CredentialVault is what the admin provider endpoints need from the vault.
type CredentialVault interface {
	Statuses(ctx context.Context) ([]secrets.Status, error)
	Set(ctx context.Context, name, value, actor string) error
	Clear(ctx context.Context, name string) error
	Writable() bool
}

// CredentialProbe proves a key works before it is saved.
type CredentialProbe interface {
	Verify(ctx context.Context, name, value string) error
}

// Auditor records admin changes. Values are never passed to it.
type Auditor interface {
	Record(ctx context.Context, actorID, action, target string, detail map[string]any) error
}

// webhookSecret reads an optional webhook secret; unset means unsigned callbacks
// are treated as hints.
func webhookSecret(ctx context.Context, fn func(context.Context) string) string {
	if fn == nil {
		return ""
	}
	return fn(ctx)
}

const maxCredentialBody = 8 << 10

func (a *App) listProviders(w http.ResponseWriter, r *http.Request) {
	statuses, err := a.deps.Vault.Statuses(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{"writable": a.deps.Vault.Writable(), "credentials": statuses})
}

func (a *App) setProvider(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value string `json:"value"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCredentialBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil || body.Value == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "a non-empty value is required")
		return
	}
	if a.deps.Probe != nil && a.deps.Vault.Writable() {
		if err := a.deps.Probe.Verify(r.Context(), r.PathValue("name"), body.Value); err != nil {
			writeError(w, http.StatusUnprocessableEntity, "provider_rejected", err.Error())
			return
		}
	}
	a.changeProvider(w, r, "credential.set", func(actor, name string) error {
		return a.deps.Vault.Set(r.Context(), name, body.Value, actor)
	})
}

func (a *App) clearProvider(w http.ResponseWriter, r *http.Request) {
	a.changeProvider(w, r, "credential.clear", func(_, name string) error {
		return a.deps.Vault.Clear(r.Context(), name)
	})
}

func (a *App) changeProvider(w http.ResponseWriter, r *http.Request, action string, change func(actor, name string) error) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	name := r.PathValue("name")
	switch err := change(identity.UserID, name); {
	case errors.Is(err, secrets.ErrUnknownName):
		writeError(w, http.StatusNotFound, "not_found", "unknown credential")
		return
	case err != nil && !a.deps.Vault.Writable():
		writeError(w, http.StatusConflict, "vault_unavailable", "APP_ENCRYPTION_KEY is not configured on the server")
		return
	case err != nil:
		writeInternal(w, r, err)
		return
	}
	if err := a.deps.Audit.Record(r.Context(), identity.UserID, action, name, map[string]any{}); err != nil {
		writeInternal(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
