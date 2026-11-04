package orchestrator

import "time"

// Workflow statuses. draft is a validated plan not yet routed; the engine
// moves it to awaiting_clarification or awaiting_approval, and only an
// approved workflow runs.
type WorkflowStatus string

const (
	WorkflowDraft                 WorkflowStatus = "draft"
	WorkflowAwaitingClarification WorkflowStatus = "awaiting_clarification"
	WorkflowAwaitingApproval      WorkflowStatus = "awaiting_approval"
	WorkflowApproved              WorkflowStatus = "approved"
	WorkflowRunning               WorkflowStatus = "running"
	WorkflowCompleted             WorkflowStatus = "completed"
	WorkflowFailed                WorkflowStatus = "failed"
	WorkflowCancelled             WorkflowStatus = "cancelled"
)

// IsTerminal reports whether the workflow will never move again.
func (s WorkflowStatus) IsTerminal() bool {
	return s == WorkflowCompleted || s == WorkflowFailed || s == WorkflowCancelled
}

// Step statuses. skipped marks steps abandoned when a dependency failed or
// the workflow was cancelled.
type StepStatus string

const (
	StepPending   StepStatus = "pending"
	StepRunning   StepStatus = "running"
	StepCompleted StepStatus = "completed"
	StepFailed    StepStatus = "failed"
	StepSkipped   StepStatus = "skipped"
)

// Step is one persisted unit of a validated plan.
type Step struct {
	ID          string
	StepID      string
	Tool        string
	Args        map[string]any
	Needs       []string
	Status      StepStatus
	Attempts    int
	Output      map[string]any
	Error       string
	StartedAt   *time.Time
	CompletedAt *time.Time
}

// StepRecord is the validated shape persisted for one plan step.
type StepRecord struct {
	StepID string
	Tool   string
	Args   map[string]any
	Needs  []string
}

// Workflow is a validated plan plus its execution record.
type Workflow struct {
	ID             string
	UserID         string
	Objective      string
	Status         WorkflowStatus
	Plan           map[string]any
	PlanHash       string
	ApprovedAt     *time.Time
	Context        map[string]any
	Error          string
	IdempotencyKey string
	NextRunAt      *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
	StartedAt      *time.Time
	CompletedAt    *time.Time
	Steps          []Step
}
