package httpserver

import (
	"context"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

// CreditReader is the user-facing side of the credit system.
type CreditReader interface {
	Balance(ctx context.Context, userID string) (int, error)
}

// CreditAdmin is the admin-facing side of the credit system.
type CreditAdmin interface {
	Prices(ctx context.Context) ([]credits.PriceRow, error)
	UpdatePrice(ctx context.Context, action string, patch credits.PricePatch, actor string) (credits.PriceRow, error)
	Settings(ctx context.Context) ([]credits.Setting, error)
	SetSetting(ctx context.Context, key string, value int, actor string) error
	FindUsers(ctx context.Context, query string, limit int) ([]credits.UserCredits, error)
	Ledger(ctx context.Context, userID string, limit int) ([]credits.LedgerRow, error)
	Usage(ctx context.Context, days int) ([]credits.UsageRow, error)
}

// CreditLedger adjusts balances; the credits service implements it.
type CreditLedger interface {
	Adjust(ctx context.Context, userID string, amount int, key, reason, actor string) (int, error)
}

// balance is zero when credits are not wired in, so tests and a stripped
// deployment still answer.
func (a *App) balance(ctx context.Context, userID string) (int, error) {
	if a.deps.Credits == nil {
		return 0, nil
	}
	return a.deps.Credits.Balance(ctx, userID)
}

func (a *App) myCredits(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	if _, err := a.deps.Accounts.Active(r.Context(), identity.UserID, identity.Email, identity.Name); err != nil {
		a.accountError(w, r, err)
		return
	}
	balance, err := a.balance(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	history := []credits.LedgerRow{}
	if a.deps.CreditAdmin != nil {
		if history, err = a.deps.CreditAdmin.Ledger(r.Context(), identity.UserID, 25); err != nil {
			writeInternal(w, r, err)
			return
		}
	}
	writeData(w, http.StatusOK, map[string]any{"balance": balance, "history": history, "asOf": time.Now().UTC()})
}
