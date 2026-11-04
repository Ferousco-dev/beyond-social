package database

import (
	"context"
	"sync"
	"time"
)

// settingsTTL is how long the admin-controlled credit settings are reused.
// They change rarely, yet a single page could read eight of them one query
// at a time; now they arrive together in one query and are kept briefly. A
// change saved through the admin console clears them at once.
const settingsTTL = 30 * time.Second

type settingsCache struct {
	mu     sync.Mutex
	values map[string]int
	at     time.Time
}

func (c *settingsCache) get(ctx context.Context, load func(context.Context) (map[string]int, error)) (map[string]int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.values != nil && time.Since(c.at) < settingsTTL {
		return c.values, nil
	}
	values, err := load(ctx)
	if err != nil {
		return nil, err
	}
	c.values, c.at = values, time.Now()
	return values, nil
}

func (c *settingsCache) clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.values = nil
}

func (s *CreditStore) allSettings(ctx context.Context) (map[string]int, error) {
	rows, err := s.pool.Query(ctx, `select key, value from public.credit_settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	values := map[string]int{}
	for rows.Next() {
		var key string
		var value int
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		values[key] = value
	}
	return values, rows.Err()
}
