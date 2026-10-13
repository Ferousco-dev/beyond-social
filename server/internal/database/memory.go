package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MemoryStore implements memory.Store and chat.SummaryStore.
type MemoryStore struct{ pool *pgxpool.Pool }

func NewMemoryStore(pool *pgxpool.Pool) *MemoryStore { return &MemoryStore{pool: pool} }

func (s *MemoryStore) List(ctx context.Context, userID string) ([]memory.Fact, error) {
	rows, err := s.pool.Query(ctx, `select id::text, content, created_at from public.user_memories where user_id = $1 order by created_at, id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	facts := []memory.Fact{}
	for rows.Next() {
		var f memory.Fact
		if err := rows.Scan(&f.ID, &f.Content, &f.CreatedAt); err != nil {
			return nil, err
		}
		facts = append(facts, f)
	}
	return facts, rows.Err()
}

// Add serialises saves per person with a transaction lock, so two requests at
// once cannot both slip under the limit.
func (s *MemoryStore) Add(ctx context.Context, userID, content string, max int) (memory.Fact, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return memory.Fact{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `select pg_advisory_xact_lock(hashtext($1))`, "memory:"+userID); err != nil {
		return memory.Fact{}, err
	}
	var f memory.Fact
	err = tx.QueryRow(ctx, `select id::text, content, created_at from public.user_memories where user_id = $1 and content = $2`, userID, content).
		Scan(&f.ID, &f.Content, &f.CreatedAt)
	switch {
	case err == nil:
		return f, tx.Commit(ctx)
	case !errors.Is(err, pgx.ErrNoRows):
		return memory.Fact{}, err
	}
	err = tx.QueryRow(ctx, `
		insert into public.user_memories (user_id, content)
		select $1, $2 where (select count(*) from public.user_memories where user_id = $1) < $3
		returning id::text, content, created_at`, userID, content, max).Scan(&f.ID, &f.Content, &f.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return memory.Fact{}, memory.ErrFull
	}
	if err != nil {
		return memory.Fact{}, err
	}
	return f, tx.Commit(ctx)
}

func (s *MemoryStore) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.pool.Exec(ctx, `delete from public.user_memories where id::text = $1 and user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return memory.ErrNotFound
	}
	return nil
}

func (s *MemoryStore) Enabled(ctx context.Context, userID string) (bool, error) {
	var enabled bool
	err := s.pool.QueryRow(ctx, `select memory_enabled from public.profiles where id = $1`, userID).Scan(&enabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return enabled, err
}

func (s *MemoryStore) SetEnabled(ctx context.Context, userID string, enabled bool) error {
	_, err := s.pool.Exec(ctx, `update public.profiles set memory_enabled = $2 where id = $1`, userID, enabled)
	return err
}

func (s *MemoryStore) Summary(ctx context.Context, userID, conversationID string) (chat.Summary, error) {
	var sum chat.Summary
	err := s.pool.QueryRow(ctx, `select content, through_message::text from public.conversation_summaries where conversation_id::text = $1 and user_id = $2`, conversationID, userID).
		Scan(&sum.Content, &sum.ThroughMessageID)
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Summary{}, nil
	}
	return sum, err
}

func (s *MemoryStore) SaveSummary(ctx context.Context, userID, conversationID string, sum chat.Summary) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.conversation_summaries (conversation_id, user_id, content, through_message)
		select c.id, c.user_id, $3, $4::uuid from public.conversations c where c.id::text = $2 and c.user_id = $1
		on conflict (conversation_id) do update set content = excluded.content, through_message = excluded.through_message, updated_at = now()`,
		userID, conversationID, sum.Content, sum.ThroughMessageID)
	return err
}
