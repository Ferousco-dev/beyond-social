package memory

import (
	"context"
	"strings"
	"testing"
)

type memStore struct {
	facts   []Fact
	enabled bool
}

func (m *memStore) List(context.Context, string) ([]Fact, error) { return m.facts, nil }
func (m *memStore) Add(_ context.Context, _, content string, max int) (Fact, error) {
	for _, f := range m.facts {
		if f.Content == content {
			return f, nil
		}
	}
	if len(m.facts) >= max {
		return Fact{}, ErrFull
	}
	f := Fact{ID: content, Content: content}
	m.facts = append(m.facts, f)
	return f, nil
}
func (m *memStore) Delete(context.Context, string, string) error         { return nil }
func (m *memStore) Enabled(context.Context, string) (bool, error)        { return m.enabled, nil }
func (m *memStore) SetEnabled(_ context.Context, _ string, e bool) error { m.enabled = e; return nil }

func TestCleanCollapsesWhitespaceAndBoundsLength(t *testing.T) {
	if got, ok := Clean("  my   brand\nis  Acme "); !ok || got != "my brand is Acme" {
		t.Fatalf("got %q %v", got, ok)
	}
	if _, ok := Clean("   "); ok {
		t.Fatal("blank accepted")
	}
	if _, ok := Clean(strings.Repeat("a", MaxFactRunes+1)); ok {
		t.Fatal("too long accepted")
	}
}

func TestBlockIsEmptyWhenOffOrNothingSaved(t *testing.T) {
	ctx := context.Background()
	store := &memStore{enabled: true}
	svc := NewService(store)
	if svc.Block(ctx, "u") != "" {
		t.Fatal("block with no facts")
	}
	if _, err := svc.Add(ctx, "u", "I make food videos"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(svc.Block(ctx, "u"), "- I make food videos") {
		t.Fatalf("block: %q", svc.Block(ctx, "u"))
	}
	_ = svc.SetEnabled(ctx, "u", false)
	if svc.Block(ctx, "u") != "" {
		t.Fatal("block while memory is off")
	}
}

func TestAddStopsAtTheLimit(t *testing.T) {
	ctx := context.Background()
	svc := NewService(&memStore{enabled: true})
	for i := 0; i < MaxFacts; i++ {
		if _, err := svc.Add(ctx, "u", strings.Repeat("x", i+1)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := svc.Add(ctx, "u", "one more"); err != ErrFull {
		t.Fatalf("err = %v", err)
	}
	if _, err := svc.Add(ctx, "u", " "); err != ErrInvalid {
		t.Fatalf("err = %v", err)
	}
}
