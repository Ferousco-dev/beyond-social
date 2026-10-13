// Package supabaseauth calls Supabase's auth admin API, which only the service
// role may use.
package supabaseauth

import (
	"context"
	"fmt"
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
