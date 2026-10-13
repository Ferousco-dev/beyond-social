package secrets

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Credential names. Each is one secret an admin can paste in.
const (
	NameApify         = "apify"
	NameKIE           = "kie"
	NameKIEWebhook    = "kie_webhook_hmac"
	NameHeygen        = "heygen"
	NameHeygenWebhook = "heygen_webhook_secret"
	NameGemini        = "gemini"
	// NameOpenRouter gives access to other language models besides Gemini.
	NameOpenRouter = "openrouter"

	// OAuth app credentials for publishing. The user-facing sign-in uses these;
	// each platform is switched on by pasting its pair.
	NameYouTubeClientID     = "youtube_client_id"
	NameYouTubeClientSecret = "youtube_client_secret"
	NameTikTokClientKey     = "tiktok_client_key"
	NameTikTokClientSecret  = "tiktok_client_secret"
	NameMetaAppID           = "meta_app_id"
	NameMetaAppSecret       = "meta_app_secret"
)

// Names lists every credential the product can use, in display order.
var Names = []string{
	NameApify, NameKIE, NameKIEWebhook, NameHeygen, NameHeygenWebhook, NameGemini, NameOpenRouter,
	NameYouTubeClientID, NameYouTubeClientSecret, NameTikTokClientKey, NameTikTokClientSecret, NameMetaAppID, NameMetaAppSecret,
}

const cacheTTL = 60 * time.Second

var ErrUnknownName = errors.New("secrets: unknown credential name")

// Record is the stored form of one credential.
type Record struct {
	Name       string
	Ciphertext []byte
	Last4      string
	UpdatedBy  string
	UpdatedAt  time.Time
}

type Store interface {
	Get(ctx context.Context, name string) (Record, bool, error)
	Put(ctx context.Context, rec Record) error
	Delete(ctx context.Context, name string) error
	List(ctx context.Context) ([]Record, error)
}

// Status describes a credential without revealing it.
type Status struct {
	Name      string     `json:"name"`
	Source    string     `json:"source"` // "vault", "environment" or "missing"
	Last4     string     `json:"last4,omitempty"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
}

type cached struct {
	value   string
	expires time.Time
}

// Vault resolves credentials, preferring the encrypted store and falling back to
// environment values so an existing deployment keeps working until an admin
// pastes a key in.
type Vault struct {
	store  Store
	sealer *Sealer
	env    map[string]string
	now    func() time.Time

	mu    sync.Mutex
	cache map[string]cached
}

// NewVault accepts a nil store or sealer: the vault is then environment only.
func NewVault(store Store, sealer *Sealer, env map[string]string) *Vault {
	return &Vault{store: store, sealer: sealer, env: env, now: time.Now, cache: map[string]cached{}}
}

// Writable reports whether admins can store keys through the product.
func (v *Vault) Writable() bool { return v.store != nil && v.sealer != nil }

func known(name string) bool {
	for _, n := range Names {
		if n == name {
			return true
		}
	}
	return false
}

// Key returns the KeyFunc for a credential. Providers call it per request.
func (v *Vault) Key(name string) provider.KeyFunc {
	return func(ctx context.Context) (string, error) {
		value, err := v.resolve(ctx, name)
		if err != nil {
			return "", err
		}
		if value == "" {
			return "", provider.ErrNotConfigured(name)
		}
		return value, nil
	}
}

// Optional is Key for credentials whose absence is legitimate (webhook secrets).
func (v *Vault) Optional(name string) func(ctx context.Context) string {
	return func(ctx context.Context) string {
		value, err := v.resolve(ctx, name)
		if err != nil {
			return ""
		}
		return value
	}
}

func (v *Vault) resolve(ctx context.Context, name string) (string, error) {
	v.mu.Lock()
	if c, ok := v.cache[name]; ok && v.now().Before(c.expires) {
		v.mu.Unlock()
		return c.value, nil
	}
	v.mu.Unlock()

	value := strings.TrimSpace(v.env[name])
	if v.Writable() {
		rec, found, err := v.store.Get(ctx, name)
		if err != nil {
			return "", err
		}
		if found {
			if value, err = v.sealer.Open(name, rec.Ciphertext); err != nil {
				return "", err
			}
		}
	}
	v.mu.Lock()
	v.cache[name] = cached{value: value, expires: v.now().Add(cacheTTL)}
	v.mu.Unlock()
	return value, nil
}

func (v *Vault) invalidate(name string) {
	v.mu.Lock()
	delete(v.cache, name)
	v.mu.Unlock()
}

// Set stores a credential encrypted. The caller is expected to have probed the
// value first.
func (v *Vault) Set(ctx context.Context, name, value, actor string) error {
	if !known(name) {
		return ErrUnknownName
	}
	if !v.Writable() {
		return errors.New("secrets: APP_ENCRYPTION_KEY is not configured")
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return errors.New("secrets: value is empty")
	}
	sealed, err := v.sealer.Seal(name, value)
	if err != nil {
		return err
	}
	last4 := value
	if len(last4) > 4 {
		last4 = last4[len(last4)-4:]
	}
	if err := v.store.Put(ctx, Record{Name: name, Ciphertext: sealed, Last4: last4, UpdatedBy: actor}); err != nil {
		return err
	}
	v.invalidate(name)
	return nil
}

// Clear removes a stored credential, reverting to the environment value if any.
func (v *Vault) Clear(ctx context.Context, name string) error {
	if !known(name) {
		return ErrUnknownName
	}
	if !v.Writable() {
		return errors.New("secrets: APP_ENCRYPTION_KEY is not configured")
	}
	if err := v.store.Delete(ctx, name); err != nil {
		return err
	}
	v.invalidate(name)
	return nil
}

// Statuses reports where each credential currently comes from.
func (v *Vault) Statuses(ctx context.Context) ([]Status, error) {
	stored := map[string]Record{}
	if v.Writable() {
		recs, err := v.store.List(ctx)
		if err != nil {
			return nil, err
		}
		for _, r := range recs {
			stored[r.Name] = r
		}
	}
	out := make([]Status, 0, len(Names))
	for _, name := range Names {
		s := Status{Name: name, Source: "missing"}
		if r, ok := stored[name]; ok {
			t := r.UpdatedAt
			s = Status{Name: name, Source: "vault", Last4: r.Last4, UpdatedAt: &t}
		} else if strings.TrimSpace(v.env[name]) != "" {
			s.Source = "environment"
		}
		out = append(out, s)
	}
	return out, nil
}
