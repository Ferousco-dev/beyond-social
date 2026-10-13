package database

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const messageColumns = `id::text, user_id::text, conversation_id::text, role, content,
	coalesce(workflow_id::text, ''), coalesce(reply_to::text, ''), created_at, coalesce(job_id::text, ''), attachments, script`

// ConversationStore implements chat.Store. Every read filters on user_id in SQL,
// so ownership does not depend on the HTTP layer.
type ConversationStore struct {
	pool *pgxpool.Pool
}

func NewConversationStore(pool *pgxpool.Pool) *ConversationStore {
	return &ConversationStore{pool: pool}
}

func scanConversation(row pgx.Row) (chat.Conversation, error) {
	var c chat.Conversation
	err := row.Scan(&c.ID, &c.Title, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Conversation{}, chat.ErrNotFound
	}
	if isInvalidText(err) {
		return chat.Conversation{}, chat.ErrNotFound
	}
	return c, err
}

func isInvalidText(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgInvalidTextRepresentation
}

func scanMessage(row pgx.Row) (chat.Message, error) {
	var m chat.Message
	var role string
	var attachments, script []byte
	err := row.Scan(&m.ID, &m.UserID, &m.ConversationID, &role, &m.Content, &m.WorkflowID, &m.ReplyTo, &m.CreatedAt, &m.JobID, &attachments, &script)
	m.Role = chat.Role(role)
	if err == nil && len(attachments) > 2 {
		err = json.Unmarshal(attachments, &m.Attachments)
	}
	if err == nil && len(script) > 0 {
		m.Script = new(chat.Script)
		err = json.Unmarshal(script, m.Script)
	}
	return m, err
}

func (s *ConversationStore) Create(ctx context.Context, userID string) (chat.Conversation, error) {
	return scanConversation(s.pool.QueryRow(ctx, `
		insert into public.conversations (user_id) values ($1)
		returning id::text, title, created_at, updated_at`, userID))
}

// List hides threads that were never answered: a title is only set once the first
// turn succeeds, so a failed first message leaves nothing behind in the sidebar.
func (s *ConversationStore) List(ctx context.Context, userID string, limit, offset int) ([]chat.Conversation, error) {
	rows, err := s.pool.Query(ctx, `
		select id::text, title, created_at, updated_at from public.conversations
		where user_id = $1 and archived_at is null and title <> ''
		order by updated_at desc limit $2 offset $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []chat.Conversation{}
	for rows.Next() {
		c, err := scanConversation(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *ConversationStore) Get(ctx context.Context, userID, id string) (chat.Conversation, error) {
	return scanConversation(s.pool.QueryRow(ctx, `
		select id::text, title, created_at, updated_at from public.conversations
		where id = $1 and user_id = $2 and archived_at is null`, id, userID))
}

func (s *ConversationStore) Archive(ctx context.Context, userID, id string) error {
	tag, err := s.pool.Exec(ctx, `
		update public.conversations set archived_at = now() where id = $1 and user_id = $2 and archived_at is null`, id, userID)
	if isInvalidText(err) || (err == nil && tag.RowsAffected() == 0) {
		return chat.ErrNotFound
	}
	return err
}

// Messages returns the newest limit messages, oldest first.
func (s *ConversationStore) Messages(ctx context.Context, userID, id string, limit int) ([]chat.Message, error) {
	rows, err := s.pool.Query(ctx, `
		select `+messageColumns+` from (
			select * from public.messages where conversation_id = $1 and user_id = $2
			order by created_at desc, id desc limit $3
		) recent order by created_at, id`, id, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []chat.Message{}
	for rows.Next() {
		m, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *ConversationStore) AddUser(ctx context.Context, m chat.Message, key string) (chat.Message, bool, error) {
	attachments, err := json.Marshal(m.Attachments)
	if err != nil {
		return chat.Message{}, false, err
	}
	if m.Attachments == nil {
		attachments = []byte("[]")
	}
	saved, err := scanMessage(s.pool.QueryRow(ctx, `
		insert into public.messages (conversation_id, user_id, role, content, idempotency_key, attachments)
		values ($1, $2, 'user', $3, nullif($4, ''), $5)
		on conflict (conversation_id, idempotency_key) where idempotency_key is not null and role = 'user' do nothing
		returning `+messageColumns, m.ConversationID, m.UserID, m.Content, key, attachments))
	if err == nil {
		return saved, true, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return chat.Message{}, false, err
	}
	existing, err := scanMessage(s.pool.QueryRow(ctx, `
		select `+messageColumns+` from public.messages
		where conversation_id = $1 and idempotency_key = $2 and role = 'user'`, m.ConversationID, key))
	return existing, false, err
}

func (s *ConversationStore) ReplyTo(ctx context.Context, userMessageID string) (chat.Message, bool, error) {
	m, err := scanMessage(s.pool.QueryRow(ctx, `
		select `+messageColumns+` from public.messages where reply_to = $1 and role = 'assistant' limit 1`, userMessageID))
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Message{}, false, nil
	}
	return m, err == nil, err
}

func (s *ConversationStore) AddAssistant(ctx context.Context, m chat.Message) (chat.Message, error) {
	var script []byte
	if m.Script != nil {
		var err error
		if script, err = json.Marshal(m.Script); err != nil {
			return chat.Message{}, err
		}
	}
	if _, err := s.pool.Exec(ctx, `update public.conversations set updated_at = now() where id = $1`, m.ConversationID); err != nil {
		return chat.Message{}, err
	}
	return scanMessage(s.pool.QueryRow(ctx, `
		insert into public.messages (conversation_id, user_id, role, content, workflow_id, reply_to, job_id, script)
		values ($1, $2, 'assistant', $3, nullif($4, '')::uuid, nullif($5, '')::uuid, nullif($6, '')::uuid, $7)
		returning `+messageColumns, m.ConversationID, m.UserID, m.Content, m.WorkflowID, m.ReplyTo, m.JobID, script))
}

func (s *ConversationStore) AddAssistantOnce(ctx context.Context, m chat.Message, key string) (chat.Message, bool, error) {
	saved, err := scanMessage(s.pool.QueryRow(ctx, `
		insert into public.messages (conversation_id, user_id, role, content, job_id, idempotency_key)
		values ($1, $2, 'assistant', $3, nullif($4, '')::uuid, $5)
		on conflict (conversation_id, idempotency_key) where idempotency_key is not null and role = 'assistant' do nothing
		returning `+messageColumns, m.ConversationID, m.UserID, m.Content, m.JobID, key))
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Message{}, false, nil
	}
	if err != nil {
		return chat.Message{}, false, err
	}
	if _, err := s.pool.Exec(ctx, `update public.conversations set updated_at = now() where id = $1`, m.ConversationID); err != nil {
		return chat.Message{}, false, err
	}
	return saved, true, nil
}

func (s *ConversationStore) SetTitle(ctx context.Context, id, title string) error {
	_, err := s.pool.Exec(ctx, `update public.conversations set title = $2, updated_at = now() where id = $1`, id, title)
	return err
}

func (s *ConversationStore) CountUserMessagesSince(ctx context.Context, userID string, since time.Time) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `
		select count(*)::int from public.messages where user_id = $1 and role = 'user' and created_at >= $2`, userID, since).Scan(&n)
	return n, err
}

// MissingFollowUps lists finished analyses started from a chat whose result
// message does not exist yet.
func (s *ConversationStore) MissingFollowUps(ctx context.Context, olderThan time.Duration, limit int) ([]jobs.Job, error) {
	rows, err := s.pool.Query(ctx, `
		select `+jobColumns+` from public.jobs j
		where job_type = 'video_analysis' and status in ('completed', 'failed')
		  and input ? 'conversation_id'
		  and updated_at < now() - make_interval(secs => $1)
		  and not exists (
		    select 1 from public.messages m
		    where m.idempotency_key = 'job:' || j.id::text and m.role = 'assistant')
		order by updated_at limit $2`, olderThan.Seconds(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []jobs.Job{}
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, job)
	}
	return out, rows.Err()
}
