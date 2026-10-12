package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("create pgx pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

func ApplyMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migration directory: %w", err)
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		files = append(files, entry.Name())
	}
	sort.Strings(files)

	for _, file := range files {
		path := filepath.Join(dir, file)
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}
		statements := strings.Split(string(content), ";")
		for _, statement := range statements {
			trimmed := strings.TrimSpace(statement)
			if trimmed == "" {
				continue
			}
			if _, err := pool.Exec(ctx, trimmed); err != nil {
				return fmt.Errorf("apply migration %s: %w", file, err)
			}
		}
	}
	return nil
}
