package chat

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
)

const (
	// RoleContext marks the one pinned turn at the start of a prompt that
	// carries saved memory and the summary of older turns. It is never stored.
	RoleContext Role = "context"

	// summaryWindow is how many recent messages are read to find the ones that
	// have fallen out of the verbatim window, and summaryBatch is how many must
	// pile up before the summary is rewritten. Rewriting in batches keeps the
	// start of the prompt identical between turns, which is what lets a
	// provider reuse its cache.
	summaryWindow   = 40
	summaryBatch    = 10
	summaryTimeout  = 90 * time.Second
	maxContextRunes = 6000
)

// Summary is the running notes on the part of a conversation the assistant no
// longer reads word for word.
type Summary struct {
	Content          string
	ThroughMessageID string
}

type SummaryStore interface {
	// Summary returns an empty Summary when there is none yet.
	Summary(ctx context.Context, userID, conversationID string) (Summary, error)
	SaveSummary(ctx context.Context, userID, conversationID string, s Summary) error
}

type Summarizer interface {
	Summarize(ctx context.Context, previous string, turns []Turn) (string, error)
}

// Memory is what the person asked the product to remember.
type Memory interface {
	Block(ctx context.Context, userID string) string
	// Remember saves a fact the person explicitly asked to keep. It reports
	// whether it was saved.
	Remember(ctx context.Context, userID, fact string) bool
}

// WithMemory pins the person's saved facts at the start of every prompt.
func (s *Service) WithMemory(m Memory) *Service {
	s.memory = m
	return s
}

// WithSummaries keeps notes on long conversations so older turns are not lost.
func (s *Service) WithSummaries(store SummaryStore, summarizer Summarizer) *Service {
	s.summaries, s.summarizer = store, summarizer
	return s
}

// contextTurn builds the pinned turn from saved facts and the conversation summary.
func (s *Service) contextTurn(ctx context.Context, userID, conversationID string) (Turn, bool) {
	var parts []string
	if s.memory != nil {
		if block := s.memory.Block(ctx, userID); block != "" {
			parts = append(parts, block)
		}
	}
	if s.summaries != nil {
		sum, err := s.summaries.Summary(ctx, userID, conversationID)
		if err != nil {
			slog.Warn("read conversation summary", "conversation", conversationID, "error", err)
		} else if sum.Content != "" {
			parts = append(parts, "Notes on the earlier part of this conversation:\n"+sum.Content)
		}
	}
	if len(parts) == 0 {
		return Turn{}, false
	}
	return Turn{Role: RoleContext, Content: truncate(strings.Join(parts, "\n\n"), maxContextRunes)}, true
}

// summarizeOlder folds the turns that have left the verbatim window into the
// conversation's notes, once enough have piled up. It never fails a request.
func (s *Service) summarizeOlder(userID, conversationID string) {
	if s.summaries == nil || s.summarizer == nil {
		return
	}
	if _, running := s.summarizing.LoadOrStore(conversationID, true); running {
		return
	}
	defer s.summarizing.Delete(conversationID)

	ctx, cancel := context.WithTimeout(context.Background(), summaryTimeout)
	defer cancel()
	if err := s.foldOlder(ctx, userID, conversationID); err != nil {
		slog.Warn("summarize conversation", "conversation", conversationID, "error", err)
	}
}

func (s *Service) foldOlder(ctx context.Context, userID, conversationID string) error {
	msgs, err := s.store.Messages(ctx, userID, conversationID, summaryWindow)
	if err != nil || len(msgs) <= historyTurns {
		return err
	}
	older := msgs[:len(msgs)-historyTurns]
	prev, err := s.summaries.Summary(ctx, userID, conversationID)
	if err != nil {
		return err
	}
	fresh := older
	for i, m := range older {
		if m.ID == prev.ThroughMessageID {
			fresh = older[i+1:]
			break
		}
	}
	if len(fresh) < summaryBatch {
		return nil
	}
	turns := make([]Turn, 0, len(fresh))
	for _, m := range fresh {
		turns = append(turns, Turn{Role: m.Role, Content: truncate(m.Content, 600)})
	}
	text, err := s.summarizer.Summarize(ctx, prev.Content, turns)
	if err != nil {
		return err
	}
	return s.summaries.SaveSummary(ctx, userID, conversationID, Summary{Content: text, ThroughMessageID: fresh[len(fresh)-1].ID})
}

type modelSummarizer struct{ inner *memory.Summarizer }

// SummarizerFrom lets the model-backed summarizer read chat turns.
func SummarizerFrom(m *memory.Summarizer) Summarizer { return modelSummarizer{inner: m} }

func (m modelSummarizer) Summarize(ctx context.Context, previous string, turns []Turn) (string, error) {
	in := make([]memory.Turn, len(turns))
	for i, t := range turns {
		in[i] = memory.Turn{Role: string(t.Role), Content: t.Content}
	}
	return m.inner.Summarize(ctx, previous, in)
}
