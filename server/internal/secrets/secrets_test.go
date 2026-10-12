package secrets

import (
	"context"
	"encoding/base64"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type memStore struct {
	recs map[string]Record
	gets int
}

func (m *memStore) Get(_ context.Context, name string) (Record, bool, error) {
	m.gets++
	r, ok := m.recs[name]
	return r, ok, nil
}
func (m *memStore) Put(_ context.Context, r Record) error {
	r.UpdatedAt = time.Now()
	m.recs[r.Name] = r
	return nil
}
func (m *memStore) Delete(_ context.Context, name string) error { delete(m.recs, name); return nil }
func (m *memStore) List(context.Context) ([]Record, error) {
	out := []Record{}
	for _, r := range m.recs {
		out = append(out, r)
	}
	return out, nil
}

func testSealer(t *testing.T) *Sealer {
	t.Helper()
	s, err := NewSealer(base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", 32))))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestSealerRoundTripAndBinding(t *testing.T) {
	s := testSealer(t)
	sealed, err := s.Seal("kie", "secret-value")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(sealed), "secret-value") {
		t.Fatal("ciphertext contains the plaintext")
	}
	if got, err := s.Open("kie", sealed); err != nil || got != "secret-value" {
		t.Fatalf("round trip = %q, %v", got, err)
	}
	if _, err := s.Open("apify", sealed); err == nil {
		t.Fatal("a value moved to another credential name must not decrypt")
	}
}

func TestSealerRejectsBadKeys(t *testing.T) {
	for _, k := range []string{"", "not base64!!", base64.StdEncoding.EncodeToString([]byte("short"))} {
		if _, err := NewSealer(k); err == nil {
			t.Fatalf("key %q accepted", k)
		}
	}
}

func TestVaultPrefersStoreThenEnvironmentAndCaches(t *testing.T) {
	store := &memStore{recs: map[string]Record{}}
	v := NewVault(store, testSealer(t), map[string]string{NameKIE: "from-env"})
	ctx := context.Background()

	if got, _ := v.Key(NameKIE)(ctx); got != "from-env" {
		t.Fatalf("env fallback = %q", got)
	}
	if err := v.Set(ctx, NameKIE, "  pasted-1234 ", "admin"); err != nil {
		t.Fatal(err)
	}
	got, err := v.Key(NameKIE)(ctx)
	if err != nil || got != "pasted-1234" {
		t.Fatalf("vault value = %q, %v", got, err)
	}
	before := store.gets
	v.Key(NameKIE)(ctx)
	if store.gets != before {
		t.Fatal("second read within the TTL should be served from cache")
	}
	if err := v.Clear(ctx, NameKIE); err != nil {
		t.Fatal(err)
	}
	if got, _ := v.Key(NameKIE)(ctx); got != "from-env" {
		t.Fatalf("after clear = %q", got)
	}
}

func TestVaultMissingKeyIsNotConfigured(t *testing.T) {
	v := NewVault(nil, nil, map[string]string{})
	_, err := v.Key(NameGemini)(context.Background())
	var pe *provider.Error
	if !errors.As(err, &pe) || pe.Code != provider.CodeNotConfigured {
		t.Fatalf("err = %v", err)
	}
	if v.Writable() {
		t.Fatal("a vault without a sealer must not be writable")
	}
	if err := v.Set(context.Background(), NameGemini, "x", ""); err == nil {
		t.Fatal("Set must fail without an encryption key")
	}
}

func TestVaultStatusesNeverExposeValues(t *testing.T) {
	store := &memStore{recs: map[string]Record{}}
	v := NewVault(store, testSealer(t), map[string]string{NameApify: "env-token"})
	ctx := context.Background()
	if err := v.Set(ctx, NameKIE, "abcdefgh5678", "admin"); err != nil {
		t.Fatal(err)
	}
	statuses, err := v.Statuses(ctx)
	if err != nil {
		t.Fatal(err)
	}
	by := map[string]Status{}
	for _, s := range statuses {
		by[s.Name] = s
	}
	if by[NameKIE].Source != "vault" || by[NameKIE].Last4 != "5678" {
		t.Fatalf("kie = %+v", by[NameKIE])
	}
	if by[NameApify].Source != "environment" || by[NameGemini].Source != "missing" {
		t.Fatalf("statuses = %+v", by)
	}
	if err := v.Set(ctx, "bogus", "x", ""); !errors.Is(err, ErrUnknownName) {
		t.Fatalf("unknown name err = %v", err)
	}
}
