package database

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EditorStore implements editor.Store.
type EditorStore struct{ pool *pgxpool.Pool }

func NewEditorStore(pool *pgxpool.Pool) *EditorStore { return &EditorStore{pool: pool} }

const projectColumns = `id::text, title, coalesce(conversation_id::text, ''), document, version, created_at, updated_at`

func scanProject(row pgx.Row) (editor.Project, error) {
	var p editor.Project
	var doc []byte
	err := row.Scan(&p.ID, &p.Title, &p.ConversationID, &doc, &p.Version, &p.CreatedAt, &p.UpdatedAt)
	p.Document = json.RawMessage(doc)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, editor.ErrNotFound
	}
	return p, err
}

func (s *EditorStore) Create(ctx context.Context, userID, title string, document json.RawMessage) (editor.Project, error) {
	// The count and insert share a statement so concurrent creates cannot pass the limit together.
	row := s.pool.QueryRow(ctx, `
		insert into public.editor_projects (user_id, title, document)
		select $1, $2, $3::jsonb
		where (select count(*) from public.editor_projects where user_id = $1) < $4
		returning `+projectColumns, userID, title, []byte(document), editor.MaxProjects)
	p, err := scanProject(row)
	if errors.Is(err, editor.ErrNotFound) {
		return p, editor.ErrLimit
	}
	return p, err
}

func (s *EditorStore) Get(ctx context.Context, userID, id string) (editor.Project, error) {
	return scanProject(s.pool.QueryRow(ctx, `select `+projectColumns+` from public.editor_projects where id = $1 and user_id = $2`, id, userID))
}

func (s *EditorStore) List(ctx context.Context, userID string, limit int) ([]editor.Summary, error) {
	rows, err := s.pool.Query(ctx, `select id::text, title, updated_at from public.editor_projects where user_id = $1 order by updated_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []editor.Summary{}
	for rows.Next() {
		var sm editor.Summary
		if err := rows.Scan(&sm.ID, &sm.Title, &sm.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, sm)
	}
	return out, rows.Err()
}

func (s *EditorStore) Save(ctx context.Context, userID, id, title string, document json.RawMessage, expected int) (editor.Project, error) {
	p, err := scanProject(s.pool.QueryRow(ctx, `
		update public.editor_projects
		set title = $3, document = $4::jsonb, version = version + 1, updated_at = now()
		where id = $1 and user_id = $2 and version = $5
		returning `+projectColumns, id, userID, title, []byte(document), expected))
	if !errors.Is(err, editor.ErrNotFound) {
		return p, err
	}
	// Nothing matched: either it is not theirs or the version moved on.
	if _, getErr := s.Get(ctx, userID, id); getErr != nil {
		return p, getErr
	}
	return p, editor.ErrStale
}

func (s *EditorStore) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.pool.Exec(ctx, `delete from public.editor_projects where id = $1 and user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return editor.ErrNotFound
	}
	return nil
}

func (s *EditorStore) ForConversation(ctx context.Context, userID, conversationID string) (editor.Project, error) {
	// Creates the project from the chat's own title; a chat that is not theirs matches nothing.
	if _, err := s.pool.Exec(ctx, `
		insert into public.editor_projects (user_id, title, conversation_id)
		select c.user_id, coalesce(nullif(left(c.title, 120), ''), 'Untitled project'), c.id
		from public.conversations c where c.id = $1 and c.user_id = $2
		on conflict (user_id, conversation_id) where conversation_id is not null do nothing`, conversationID, userID); err != nil {
		return editor.Project{}, err
	}
	return scanProject(s.pool.QueryRow(ctx, `select `+projectColumns+` from public.editor_projects where user_id = $1 and conversation_id = $2`, userID, conversationID))
}
