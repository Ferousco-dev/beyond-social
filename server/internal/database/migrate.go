package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"path"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// migrationLockKey serialises concurrent instances starting up together.
const migrationLockKey = 724_001_137

// ApplyMigrations applies each *.sql file in lexical order exactly once. A file
// runs in its own transaction together with its bookkeeping row, so a failure
// leaves no partial state. Applied files are checksummed: editing one after the
// fact is an error, because history must change by adding a new migration.
func ApplyMigrations(ctx context.Context, pool *pgxpool.Pool, source fs.FS) error {
	names, err := fs.Glob(source, "*.sql")
	if err != nil {
		return fmt.Errorf("list migrations: %w", err)
	}
	sort.Strings(names)

	for _, name := range names {
		content, err := fs.ReadFile(source, path.Clean(name))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}
		if err := applyOne(ctx, pool, name, string(content)); err != nil {
			return fmt.Errorf("migration %s: %w", name, err)
		}
	}
	return nil
}

func applyOne(ctx context.Context, pool *pgxpool.Pool, name, sql string) error {
	sum := sha256.Sum256([]byte(sql))
	checksum := hex.EncodeToString(sum[:])

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Transaction-scoped so it also works behind a transaction-mode pooler.
	if _, err := tx.Exec(ctx, `select pg_advisory_xact_lock($1)`, migrationLockKey); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		create table if not exists public.schema_migrations (
			version text primary key,
			checksum text not null,
			applied_at timestamptz not null default now()
		)`); err != nil {
		return err
	}

	var applied string
	err = tx.QueryRow(ctx, `select checksum from public.schema_migrations where version = $1`, name).Scan(&applied)
	switch {
	case err == nil:
		if applied != checksum {
			return fmt.Errorf("file changed after it was applied")
		}
		return nil
	case err != pgx.ErrNoRows:
		return err
	}

	// No arguments means the simple protocol, which allows multiple statements.
	if _, err := tx.Exec(ctx, sql); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `insert into public.schema_migrations (version, checksum) values ($1, $2)`, name, checksum); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
