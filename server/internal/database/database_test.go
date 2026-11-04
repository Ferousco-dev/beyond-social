package database

import (
	"context"
	"os"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/Ferousco-dev/beyond-social/server/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
)

// testPool connects to TEST_DATABASE_URL and resets the public schema. It
// refuses any database whose name does not end in _test, so a stray environment
// variable can never point these tests at real data.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping PostgreSQL integration test")
	}
	ctx := context.Background()
	pool, err := Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	var name string
	if err := pool.QueryRow(ctx, `select current_database()`).Scan(&name); err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(name, "_test") {
		t.Fatalf("refusing to reset database %q: name must end in _test", name)
	}
	if _, err := pool.Exec(ctx, `drop schema public cascade; create schema public`); err != nil {
		t.Fatal(err)
	}
	if err := ApplyMigrations(ctx, pool, migrations.FS); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	return pool
}

func TestMigrationsAreIdempotentAndChecksummed(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	if err := ApplyMigrations(ctx, pool, migrations.FS); err != nil {
		t.Fatalf("second run must be a no-op: %v", err)
	}
	var applied int
	_ = pool.QueryRow(ctx, `select count(*) from public.schema_migrations`).Scan(&applied)
	files, _ := migrations.FS.ReadDir(".")
	sqlFiles := 0
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".sql") {
			sqlFiles++
		}
	}
	if applied != sqlFiles {
		t.Fatalf("expected %d recorded migrations, got %d", sqlFiles, applied)
	}

	edited := fstest.MapFS{"001_foundation.sql": {Data: []byte("select 1")}}
	if err := ApplyMigrations(ctx, pool, edited); err == nil {
		t.Fatal("expected an edited, already applied migration to be rejected")
	}
}

func TestFailedMigrationLeavesNoPartialState(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	bad := fstest.MapFS{"900_bad.sql": {Data: []byte("create table public.should_not_exist (id int); select 1/0;")}}
	if err := ApplyMigrations(ctx, pool, bad); err == nil {
		t.Fatal("expected migration failure")
	}
	var exists bool
	_ = pool.QueryRow(ctx, `select to_regclass('public.should_not_exist') is not null`).Scan(&exists)
	if exists {
		t.Fatal("failed migration must roll back completely")
	}
}

func TestEveryTableHasRowLevelSecurity(t *testing.T) {
	pool := testPool(t)
	rows, err := pool.Query(context.Background(), `
		select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity and c.relname <> 'schema_migrations'`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		_ = rows.Scan(&name)
		t.Errorf("table public.%s is reachable over PostgREST without row-level security", name)
	}
}
