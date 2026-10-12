package database

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
	"github.com/jackc/pgx/v5/pgxpool"
)

// VoiceRecords implements voices.Records from the avatars table.
type VoiceRecords struct {
	pool *pgxpool.Pool
}

func NewVoiceRecords(pool *pgxpool.Pool) *VoiceRecords { return &VoiceRecords{pool: pool} }

func (r *VoiceRecords) OwnVoices(ctx context.Context, userID string) ([]voices.Voice, error) {
	rows, err := r.pool.Query(ctx, `
		select provider_voice_id, coalesce(name, 'My avatar') || ' (cloned voice)'
		from public.avatars
		where user_id = $1 and training_status = 'ready' and provider_voice_id is not null`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := map[string]bool{}
	var out []voices.Voice
	for rows.Next() {
		v := voices.Voice{Scope: voices.ScopeOwn}
		if err := rows.Scan(&v.ID, &v.Name); err != nil {
			return nil, err
		}
		if !seen[v.ID] {
			seen[v.ID] = true
			out = append(out, v)
		}
	}
	return out, rows.Err()
}

func (r *VoiceRecords) Ownership(ctx context.Context, userID, voiceID string) (own, other bool, err error) {
	err = r.pool.QueryRow(ctx, `
		with owners as (
			select user_id from public.avatars where provider_voice_id = $2
		)
		select coalesce(bool_or(user_id = $1), false), coalesce(bool_or(user_id <> $1), false) from owners`,
		userID, voiceID).Scan(&own, &other)
	return own, other, err
}
