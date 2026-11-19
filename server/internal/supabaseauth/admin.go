// Package supabaseauth calls Supabase's auth admin API, which only the service
// role may use.
package supabaseauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type Admin struct {
	base string
	key  string
	http *http.Client
}

func NewAdmin(supabaseURL, serviceRoleKey string) *Admin {
	return &Admin{base: strings.TrimRight(supabaseURL, "/") + "/auth/v1", key: serviceRoleKey, http: &http.Client{Timeout: 15 * time.Second}}
}

// RemoveUser deletes a sign-in, so the person can no longer log in. A user that
// is already gone counts as removed.
func (a *Admin) RemoveUser(ctx context.Context, id string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, a.base+"/admin/users/"+id, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+a.key)
	req.Header.Set("apikey", a.key)
	resp, err := a.http.Do(req)
	if err != nil {
		return &provider.Error{Provider: "supabase", Message: "request failed", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode < 300:
		return nil
	default:
		return provider.FromHTTPStatus("supabase", resp.StatusCode, fmt.Sprintf("remove user: status %d", resp.StatusCode))
	}
}

// RecoveryToken makes a one-time password reset token for an address. Supabase
// sends nothing: the caller emails the token itself. ok is false when no account
// uses that address.
func (a *Admin) RecoveryToken(ctx context.Context, email string) (token string, ok bool, err error) {
	body, _ := json.Marshal(map[string]string{"type": "recovery", "email": email})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.base+"/admin/generate_link", bytes.NewReader(body))
	if err != nil {
		return "", false, err
	}
	req.Header.Set("Authorization", "Bearer "+a.key)
	req.Header.Set("apikey", a.key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := a.http.Do(req)
	if err != nil {
		return "", false, &provider.Error{Provider: "supabase", Message: "request failed", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusUnprocessableEntity:
		return "", false, nil
	case resp.StatusCode >= 300:
		return "", false, provider.FromHTTPStatus("supabase", resp.StatusCode, fmt.Sprintf("recovery token: status %d", resp.StatusCode))
	}
	var out struct {
		HashedToken string `json:"hashed_token"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&out); err != nil || out.HashedToken == "" {
		return "", false, &provider.Error{Provider: "supabase", Message: "no recovery token in the reply"}
	}
	return out.HashedToken, true, nil
}
