package providers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

// Thresholds are admin settings, in the provider's own unit.
var thresholdSetting = map[string]string{
	secrets.NameKIE:    "alert_kie_credits",
	secrets.NameHeygen: "alert_heygen_usd",
	secrets.NameApify:  "alert_apify_usd",
}

// Monitor checks provider balances on a schedule and alerts an admin before an
// account runs dry, instead of after a user hits the wall.
type Monitor struct {
	Checker   *Checker
	Key       func(name string) provider.KeyFunc
	Threshold func(ctx context.Context, setting string) (int, bool, error)
	Alerts    alerts.Reporter
	// Snapshot records each reading so real spend can be worked out later.
	Snapshot func(ctx context.Context, provider string, amount float64, unit string) error
	Interval time.Duration
}

func (m *Monitor) Run(ctx context.Context) {
	interval := m.Interval
	if interval <= 0 {
		interval = 15 * time.Minute
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		m.Once(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// Once checks every provider that has a key and returns the balances it read.
func (m *Monitor) Once(ctx context.Context) []Balance {
	var seen []Balance
	for name, setting := range thresholdSetting {
		key, err := m.Key(name)(ctx)
		if err != nil {
			continue // not configured: nothing to watch yet
		}
		balance, err := m.Checker.Balance(ctx, name, key)
		switch {
		case errors.Is(err, ErrNoBalance):
			continue
		case err != nil:
			slog.Warn("provider balance check failed", "provider", name, "error", err)
			continue
		}
		seen = append(seen, balance)
		if m.Snapshot != nil {
			if err := m.Snapshot(ctx, name, balance.Amount, balance.Unit); err != nil {
				slog.Error("record provider balance", "provider", name, "error", err)
			}
		}
		limit, ok, err := m.Threshold(ctx, setting)
		if err != nil || !ok || balance.Amount >= float64(limit) {
			continue
		}
		alerts.Report(ctx, m.Alerts, &provider.Error{
			Provider: name,
			Status:   http.StatusPaymentRequired,
			Message:  fmt.Sprintf("balance is low: %.2f %s left (alert below %d)", balance.Amount, balance.Unit, limit),
		}, alerts.Context{Source: "balance monitor"})
	}
	return seen
}
