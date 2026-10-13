package chat

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

type memSummaries struct{ saved Summary }

func (m *memSummaries) Summary(context.Context, string, string) (Summary, error) { return m.saved, nil }
func (m *memSummaries) SaveSummary(_ context.Context, _, _ string, s Summary) error {
	m.saved = s
	return nil
}

type stubSummarizer struct {
	calls    int
	previous string
	turns    []Turn
}

func (s *stubSummarizer) Summarize(_ context.Context, previous string, turns []Turn) (string, error) {
	s.calls++
	s.previous, s.turns = previous, turns
	return fmt.Sprintf("notes %d", s.calls), nil
}

type stubMemory struct {
	block string
	saved []string
}

func (m *stubMemory) Block(context.Context, string) string { return m.block }
func (m *stubMemory) Remember(_ context.Context, _, fact string) bool {
	m.saved = append(m.saved, fact)
	return true
}

type captureRouter struct {
	got      RouteInput
	decision Decision
}

func (r *captureRouter) Route(_ context.Context, in RouteInput) (Decision, error) {
	r.got = in
	return r.decision, nil
}

func conversationOf(n int) *memStore {
	store := newMem()
	for i := 1; i <= n; i++ {
		role := RoleUser
		if i%2 == 0 {
			role = RoleAssistant
		}
		store.msgs = append(store.msgs, Message{ID: fmt.Sprintf("m%02d", i), Role: role, Content: fmt.Sprintf("turn %d", i)})
	}
	return store
}

func TestOlderTurnsAreFoldedInBatchesNotOnEveryMessage(t *testing.T) {
	store := conversationOf(historyTurns + summaryBatch - 1)
	sums, summarizer := &memSummaries{}, &stubSummarizer{}
	svc := NewService(store, &stubRouter{}, &stubPlanner{}).WithSummaries(sums, summarizer)

	if err := svc.foldOlder(context.Background(), "u", "c1"); err != nil || summarizer.calls != 0 {
		t.Fatalf("summarized too early: calls=%d err=%v", summarizer.calls, err)
	}

	store = conversationOf(historyTurns + summaryBatch)
	svc.store = store
	if err := svc.foldOlder(context.Background(), "u", "c1"); err != nil || summarizer.calls != 1 {
		t.Fatalf("calls=%d err=%v", summarizer.calls, err)
	}
	if len(summarizer.turns) != summaryBatch || sums.saved.ThroughMessageID != "m10" || sums.saved.Content != "notes 1" {
		t.Fatalf("folded %d turns, saved %+v", len(summarizer.turns), sums.saved)
	}

	// The next pass starts after the last folded message and carries the notes forward.
	store = conversationOf(historyTurns + 2*summaryBatch)
	svc.store = store
	if err := svc.foldOlder(context.Background(), "u", "c1"); err != nil || summarizer.calls != 2 {
		t.Fatalf("calls=%d err=%v", summarizer.calls, err)
	}
	if summarizer.previous != "notes 1" || summarizer.turns[0].Content != "turn 11" || sums.saved.ThroughMessageID != "m20" {
		t.Fatalf("previous=%q first=%q saved=%+v", summarizer.previous, summarizer.turns[0].Content, sums.saved)
	}
}

func TestThePinnedTurnCarriesFactsAndNotesAndKeepsThePromptTheSameLength(t *testing.T) {
	store := conversationOf(historyTurns + 1) // the last one is the message being answered
	router := &captureRouter{decision: Decision{Reply: "ok"}}
	svc := NewService(store, router, &stubPlanner{}).
		WithMemory(&stubMemory{block: "- I make food videos"}).
		WithSummaries(&memSummaries{saved: Summary{Content: "A recipe series"}}, &stubSummarizer{})

	if _, err := svc.Send(context.Background(), "u1", "c1", "next", "k1", nil, ""); err != nil {
		t.Fatal(err)
	}
	h := router.got.History
	if len(h) != historyTurns || h[0].Role != RoleContext {
		t.Fatalf("history has %d turns, first role %q", len(h), h[0].Role)
	}
	if !strings.Contains(h[0].Content, "I make food videos") || !strings.Contains(h[0].Content, "A recipe series") {
		t.Fatalf("pinned turn: %q", h[0].Content)
	}
}

func TestNoMemoryMeansNoPinnedTurn(t *testing.T) {
	router := &captureRouter{decision: Decision{Reply: "ok"}}
	svc := NewService(conversationOf(3), router, &stubPlanner{})
	if _, err := svc.Send(context.Background(), "u1", "c1", "hi", "k1", nil, ""); err != nil {
		t.Fatal(err)
	}
	for _, turn := range router.got.History {
		if turn.Role == RoleContext {
			t.Fatal("a pinned turn appeared with nothing to pin")
		}
	}
}

func TestAnExplicitRequestToRememberIsSavedAndSaidSo(t *testing.T) {
	mem := &stubMemory{}
	router := &captureRouter{decision: Decision{Reply: "Got it.", Remember: "The user's brand is Acme"}}
	svc := NewService(newMem(), router, &stubPlanner{}).WithMemory(mem)

	exchange, err := svc.Send(context.Background(), "u1", "c1", "remember my brand is Acme", "k1", nil, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(mem.saved) != 1 || mem.saved[0] != "The user's brand is Acme" {
		t.Fatalf("saved %v", mem.saved)
	}
	if !strings.Contains(exchange.Assistant.Content, "Saved to your memory") {
		t.Fatalf("reply: %q", exchange.Assistant.Content)
	}
}
