package credits

import (
	"context"
	"log/slog"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// Spend is what one finished job is estimated to have cost the provider.
type Spend struct {
	JobID, UserID, Provider, JobType, Action string
	Units                                    int
	CostUSD                                  float64
}

// SpendStore reads unit costs from the price table and keeps the records.
type SpendStore interface {
	// UnitCost is the provider and the provider's cost for one unit of an action.
	UnitCost(ctx context.Context, action string) (provider string, costUSD float64, ok bool, err error)
	// RecordSpend keeps one row per job; recording the same job again changes nothing.
	RecordSpend(ctx context.Context, s Spend) error
}

// SpendRecorder notes the estimated provider cost of every job that delivers,
// whatever the owner's plan. It implements jobs.Observer.
type SpendRecorder struct {
	biller *JobBiller
	store  SpendStore
}

func NewSpendRecorder(biller *JobBiller, store SpendStore) *SpendRecorder {
	return &SpendRecorder{biller: biller, store: store}
}

// JobFinished records completed jobs only: a failed job is refunded and is not
// expected to have cost anything. Problems are logged, never returned, because
// bookkeeping must not disturb a job that has already finished.
func (r *SpendRecorder) JobFinished(ctx context.Context, job jobs.Job) {
	if job.Status != jobs.StatusCompleted {
		return
	}
	action, units, err := r.biller.quantity(job)
	if err != nil || action == "" || units <= 0 {
		return
	}
	provider, unitCost, ok, err := r.store.UnitCost(ctx, action)
	if err != nil {
		slog.Warn("read unit cost", "job_id", job.ID, "action", action, "error", err)
		return
	}
	if !ok {
		return
	}
	spend := Spend{JobID: job.ID, UserID: job.UserID, Provider: provider, JobType: job.Type, Action: action,
		Units: units, CostUSD: unitCost * float64(units)}
	if err := r.store.RecordSpend(ctx, spend); err != nil {
		slog.Warn("record provider spend", "job_id", job.ID, "error", err)
	}
}

// SpendReport is the admin view of where money went over a period.
type SpendReport struct {
	Days      int           `json:"days"`
	Providers []SpendTotal  `json:"providers"`
	Actions   []ActionSpend `json:"actions"`
	Users     []UserSpend   `json:"users"`
	Daily     []DailySpend  `json:"daily"`
	Models    []ModelUsage  `json:"models"`
}

type SpendTotal struct {
	Provider string  `json:"provider"`
	Jobs     int     `json:"jobs"`
	CostUSD  float64 `json:"estimatedCostUsd"`
}

type ActionSpend struct {
	Provider string  `json:"provider"`
	Action   string  `json:"action"`
	Jobs     int     `json:"jobs"`
	Units    int     `json:"units"`
	CostUSD  float64 `json:"estimatedCostUsd"`
}

type UserSpend struct {
	Email   string  `json:"email"`
	Jobs    int     `json:"jobs"`
	CostUSD float64 `json:"estimatedCostUsd"`
}

type DailySpend struct {
	Date    string  `json:"date"`
	CostUSD float64 `json:"estimatedCostUsd"`
	Tokens  int     `json:"tokens"`
}

type ModelUsage struct {
	Provider     string `json:"provider"`
	Model        string `json:"model"`
	Calls        int    `json:"calls"`
	InputTokens  int    `json:"inputTokens"`
	OutputTokens int    `json:"outputTokens"`
}
