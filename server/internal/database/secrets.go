package database

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SecretStore implements secrets.Store.
type SecretStore struct {
	pool *pgxpool.Pool
}

func NewSecretStore(pool *pgxpool.Pool) *SecretStore { return &SecretStore{pool: pool} }

func (s *SecretStore) Get(ctx context.Context, name string) (secrets.Record, bool, error) {
	var r secrets.Record
	err := s.pool.QueryRow(ctx, `
		select name, ciphertext, last4, coalesce(updated_by::text, ''), updated_at
		from public.provider_credentials where name = $1`, name).
		Scan(&r.Name, &r.Ciphertext, &r.Last4, &r.UpdatedBy, &r.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return secrets.Record{}, false, nil
	}
	return r, err == nil, err
}

func (s *SecretStore) Put(ctx context.Context, r secrets.Record) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.provider_credentials (name, ciphertext, last4, updated_by)
		values ($1, $2, $3, nullif($4, '')::uuid)
		on conflict (name) do update set
			ciphertext = excluded.ciphertext, last4 = excluded.last4,
			updated_by = excluded.updated_by, updated_at = now()`,
		r.Name, r.Ciphertext, r.Last4, r.UpdatedBy)
	return err
}

func (s *SecretStore) Delete(ctx context.Context, name string) error {
	_, err := s.pool.Exec(ctx, `delete from public.provider_credentials where name = $1`, name)
	return err
}

func (s *SecretStore) List(ctx context.Context) ([]secrets.Record, error) {
	rows, err := s.pool.Query(ctx, `
		select name, last4, coalesce(updated_by::text, ''), updated_at
		from public.provider_credentials order by name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []secrets.Record{}
	for rows.Next() {
		var r secrets.Record
		if err := rows.Scan(&r.Name, &r.Last4, &r.UpdatedBy, &r.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// AuditStore writes admin_audit_log rows.
type AuditStore struct {
	pool *pgxpool.Pool
}

func NewAuditStore(pool *pgxpool.Pool) *AuditStore { return &AuditStore{pool: pool} }

// Record never receives secret values: detail carries only non-sensitive facts.
func (s *AuditStore) Record(ctx context.Context, actorID, action, target string, detail map[string]any) error {
	raw, err := json.Marshal(detail)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		insert into public.admin_audit_log (actor_id, action, target, detail)
		values (nullif($1, '')::uuid, $2, $3, $4)`, actorID, action, target, raw)
	return err
}
