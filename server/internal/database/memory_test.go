package database

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
	"github.com/google/uuid"
)

func memoryUser(t *testing.T) (context.Context, *MemoryStore, string) {
	t.Helper()
	pool := testPool(t)
	ctx := context.Background()
	id := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "Mem"); err != nil {
		t.Fatal(err)
	}
	return ctx, NewMemoryStore(pool), id
}

func TestFactsAreSavedOnceListedInOrderAndDeletedOnlyByTheirOwner(t *testing.T) {
	ctx, store, user := memoryUser(t)
	first, err := store.Add(ctx, user, "I make food videos", memory.MaxFacts)
	if err != nil {
		t.Fatal(err)
	}
	if again, err := store.Add(ctx, user, "I make food videos", memory.MaxFacts); err != nil || again.ID != first.ID {
		t.Fatalf("duplicate saved twice: %+v %v", again, err)
	}
	if _, err := store.Add(ctx, user, "Casual tone", memory.MaxFacts); err != nil {
		t.Fatal(err)
	}
	facts, err := store.List(ctx, user)
	if err != nil || len(facts) != 2 || facts[0].Content != "I make food videos" {
		t.Fatalf("facts = %+v err=%v", facts, err)
	}
	if err := store.Delete(ctx, uuid.NewString(), first.ID); !errors.Is(err, memory.ErrNotFound) {
		t.Fatalf("a stranger deleted a memory: %v", err)
	}
	if err := store.Delete(ctx, user, first.ID); err != nil {
		t.Fatal(err)
	}
}

func TestTheLimitHoldsWhenSavesRaceEachOther(t *testing.T) {
	ctx, store, user := memoryUser(t)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, _ = store.Add(ctx, user, string(rune('a'+i)), 3)
		}(i)
	}
	wg.Wait()
	if facts, _ := store.List(ctx, user); len(facts) != 3 {
		t.Fatalf("%d facts saved with a limit of 3", len(facts))
	}
	if _, err := store.Add(ctx, user, "zzz", 3); !errors.Is(err, memory.ErrFull) {
		t.Fatalf("err = %v", err)
	}
}

func TestMemoryIsOnByDefaultAndCanBeSwitchedOff(t *testing.T) {
	ctx, store, user := memoryUser(t)
	if on, err := store.Enabled(ctx, user); err != nil || !on {
		t.Fatalf("default: %v %v", on, err)
	}
	if err := store.SetEnabled(ctx, user, false); err != nil {
		t.Fatal(err)
	}
	if on, _ := store.Enabled(ctx, user); on {
		t.Fatal("still on")
	}
}

func TestSummariesBelongToTheirConversationAndOwner(t *testing.T) {
	ctx, store, user := memoryUser(t)
	conv, err := NewConversationStore(store.pool).Create(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	if got, err := store.Summary(ctx, user, conv.ID); err != nil || got.Content != "" {
		t.Fatalf("empty summary = %+v %v", got, err)
	}
	through := uuid.NewString()
	if err := store.SaveSummary(ctx, user, conv.ID, chat.Summary{Content: "v1", ThroughMessageID: through}); err != nil {
		t.Fatal(err)
	}
	if err := store.SaveSummary(ctx, user, conv.ID, chat.Summary{Content: "v2", ThroughMessageID: through}); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Summary(ctx, user, conv.ID); got.Content != "v2" || got.ThroughMessageID != through {
		t.Fatalf("summary = %+v", got)
	}
	// Someone else's id writes nothing and reads nothing.
	if err := store.SaveSummary(ctx, uuid.NewString(), conv.ID, chat.Summary{Content: "stolen", ThroughMessageID: through}); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Summary(ctx, user, conv.ID); got.Content != "v2" {
		t.Fatalf("a stranger overwrote the summary: %+v", got)
	}
}
