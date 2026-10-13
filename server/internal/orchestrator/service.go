package orchestrator

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// Workflow event types, published on the existing per-user hub.
const (
	EventPlanning         = "workflow.planning"
	EventAwaitingClarify  = "workflow.awaiting_clarification"
	EventAwaitingApproval = "workflow.awaiting_approval"
	EventApproved         = "workflow.approved"
	EventStarted          = "workflow.started"
	EventStepStarted      = "workflow.step_started"
	EventStepCompleted    = "workflow.step_completed"
	EventStepFailed       = "workflow.step_failed"
	EventCompleted        = "workflow.completed"
	EventFailed           = "workflow.failed"
	EventCancelled        = "workflow.cancelled"
	EventRecovered        = "workflow.recovered"
)

// MaxActiveWorkflowsPerUser caps concurrent workflows. Each workflow can fan
// out into billable provider work, so this is a spend control, not just load.
const MaxActiveWorkflowsPerUser = 3

// stuckStepAge fails a step whose provider work never settles. The underlying
// pools self-terminate first; this is the backstop.
const stuckStepAge = 45 * time.Minute

// Store is the persistence the engine needs. *database.WorkflowStore satisfies it.
type Store interface {
	Create(ctx context.Context, userID, objective string, plan map[string]any, steps []StepRecord, idempotencyKey, status string) (Workflow, bool, error)
	Get(ctx context.Context, userID, id string) (Workflow, error)
	List(ctx context.Context, userID string, limit, offset int) ([]Workflow, error)
	CountActive(ctx context.Context, userID string) (int, error)
	Transition(ctx context.Context, userID, id string, from []WorkflowStatus, to WorkflowStatus, setPlanHash bool, planHash, errorMessage string) (Workflow, error)
	UpdateStep(ctx context.Context, workflowID, stepID string, status StepStatus, output map[string]any, errorMessage string) error
	SkipPending(ctx context.Context, workflowID string) error
	Claim(ctx context.Context, limit int, lease time.Duration) ([]Workflow, error)
}

var (
	// ErrTooManyWorkflows caps concurrent workflows per user.
	ErrTooManyWorkflows = errors.New("too many active workflows")
	// ErrNotApprovable rejects approval in the wrong state.
	ErrNotApprovable = errors.New("workflow is not awaiting approval")
	// ErrPlanChanged rejects approval when the plan drifted since preview.
	ErrPlanChanged = errors.New("plan changed since preview; review it again")
	// ErrNotStartable rejects starting a workflow that was never approved.
	ErrNotStartable = errors.New("only approved workflows can start")
)

// Deps wires the service to planning, persistence, providers, and realtime.
type Deps struct {
	Store     Store
	Planner   *Planner
	Registry  *Registry
	Discovery DiscoverySubmitter
	Transform TransformSubmitter
	AvatarVid AvatarVideoSubmitter
	// Generate is optional: without it a generate_video step cannot run.
	Generate GenerateSubmitter
	// Posts is optional: without it a schedule_post step cannot run.
	Posts     PostScheduler
	Jobs      JobReader
	Publisher realtime.Publisher
	Credits   CreditsChecker
	Alerts    alerts.Reporter
}

// DiscoverySubmitter queues and reads Apify discoveries.
type DiscoverySubmitter interface {
	Create(ctx context.Context, userID string, p discovery.Params) (discovery.Discovery, error)
	Get(ctx context.Context, userID, id string) (discovery.Discovery, error)
}

// TransformSubmitter queues KIE video transforms. Submit is idempotent on the
// caller's key, which is what makes engine retries spend-safe.
type TransformSubmitter interface {
	Submit(ctx context.Context, userID, videoID, prompt, idempotencyKey string) (jobs.Job, bool, error)
}

// AvatarVideoSubmitter queues HeyGen avatar videos, idempotent like transforms.
type AvatarVideoSubmitter interface {
	Submit(ctx context.Context, userID string, in avatarvideo.SubmitInput) (jobs.Job, bool, error)
}

// GenerateSubmitter queues generated video clips, idempotent like the others.
type GenerateSubmitter interface {
	Submit(ctx context.Context, userID string, r generate.Request, key string) (jobs.Job, bool, error)
}

// PostScheduler queues posts to social accounts, idempotent on the key.
type PostScheduler interface {
	Schedule(ctx context.Context, userID string, r publish.Request, key string) (publish.Post, bool, error)
}

// JobReader follows provider jobs for reconciliation.
type JobReader interface {
	Get(ctx context.Context, userID, jobID string) (jobs.Job, error)
}

// Service orchestrates AI-planned, human-approved workflows.
type Service struct {
	deps Deps
}

// NewService validates the wiring. A nil publisher disables events; every
// other dependency is required.
func NewService(d Deps) (*Service, error) {
	switch {
	case d.Store == nil:
		return nil, errors.New("orchestrator: store is required")
	case d.Planner == nil:
		return nil, errors.New("orchestrator: planner is required")
	case d.Registry == nil:
		return nil, errors.New("orchestrator: registry is required")
	case d.Discovery == nil || d.Transform == nil || d.AvatarVid == nil || d.Jobs == nil:
		return nil, errors.New("orchestrator: provider submitters are required")
	case d.Credits == nil:
		return nil, errors.New("orchestrator: credits checker is required")
	}
	return &Service{deps: d}, nil
}

// Submit plans a workflow from a natural-language objective and persists it.
// Clarification plans wait for answers; approval-gated plans wait for approval;
// read-only plans are approved at once and picked up by the engine.
func (s *Service) Submit(ctx context.Context, userID, objective string, view ContextView, idempotencyKey string) (Workflow, error) {
	active, err := s.deps.Store.CountActive(ctx, userID)
	if err != nil {
		return Workflow{}, err
	}
	if active >= MaxActiveWorkflowsPerUser {
		return Workflow{}, ErrTooManyWorkflows
	}
	result, err := s.deps.Planner.Plan(ctx, objective, view)
	if err != nil {
		alerts.Report(ctx, s.deps.Alerts, err, alerts.Context{Source: "workflow planning", UserID: userID})
	}
	if err != nil {
		return Workflow{}, err
	}
	return s.persist(ctx, userID, result.Plan, result.Ready, idempotencyKey)
}

// SubmitPlan stores a plan that was built without the planner, for example from
// a script the user approved. It is validated exactly like a planned one and
// waits for approval the same way.
func (s *Service) SubmitPlan(ctx context.Context, userID string, plan Plan, idempotencyKey string) (Workflow, error) {
	active, err := s.deps.Store.CountActive(ctx, userID)
	if err != nil {
		return Workflow{}, err
	}
	if active >= MaxActiveWorkflowsPerUser {
		return Workflow{}, ErrTooManyWorkflows
	}
	if err := ValidatePlan(plan, s.deps.Registry); err != nil {
		return Workflow{}, err
	}
	return s.persist(ctx, userID, plan, !plan.RequiresClarification(), idempotencyKey)
}

// persist saves a validated plan and moves it to the state it should wait in.
func (s *Service) persist(ctx context.Context, userID string, plan Plan, ready bool, idempotencyKey string) (Workflow, error) {
	planMap, err := planToMap(plan)
	if err != nil {
		return Workflow{}, err
	}
	if !ready {
		workflow, _, err := s.deps.Store.Create(ctx, userID, plan.Objective, planMap, nil, idempotencyKey, string(WorkflowAwaitingClarification))
		if err != nil {
			return Workflow{}, err
		}
		s.publish(userID, EventAwaitingClarify, workflow.ID, map[string]any{"questions": plan.MissingInfo})
		return workflow, nil
	}
	var records []StepRecord
	for _, step := range plan.Steps {
		records = append(records, StepRecord{StepID: step.ID, Tool: step.Tool, Args: step.Args, Needs: step.Needs})
	}
	workflow, _, err := s.deps.Store.Create(ctx, userID, plan.Objective, planMap, records, idempotencyKey, string(WorkflowDraft))
	if err != nil {
		return Workflow{}, err
	}
	if plan.RequiresApproval(s.deps.Registry) {
		workflow, err = s.deps.Store.Transition(ctx, userID, workflow.ID,
			[]WorkflowStatus{WorkflowDraft}, WorkflowAwaitingApproval, false, "", "")
		if err != nil {
			return Workflow{}, err
		}
		s.publish(userID, EventAwaitingApproval, workflow.ID, map[string]any{"steps": len(records)})
		return workflow, nil
	}
	hash, err := PlanHash(planMap)
	if err != nil {
		return Workflow{}, err
	}
	workflow, err = s.deps.Store.Transition(ctx, userID, workflow.ID,
		[]WorkflowStatus{WorkflowDraft}, WorkflowApproved, true, hash, "")
	if err != nil {
		return Workflow{}, err
	}
	return workflow, nil
}

// Approve binds an approval to the exact plan the user previewed. The hash
// must match the stored plan byte for byte in canonical form; any drift
// rejects the approval so a changed plan can never run on an old consent.
func (s *Service) Approve(ctx context.Context, userID, workflowID, planHash string) (Workflow, error) {
	workflow, err := s.deps.Store.Get(ctx, userID, workflowID)
	if err != nil {
		return Workflow{}, err
	}
	if workflow.Status != WorkflowAwaitingApproval {
		return Workflow{}, ErrNotApprovable
	}
	current, err := PlanHash(workflow.Plan)
	if err != nil {
		return Workflow{}, err
	}
	if current != planHash {
		return Workflow{}, ErrPlanChanged
	}
	workflow, err = s.deps.Store.Transition(ctx, userID, workflowID,
		[]WorkflowStatus{WorkflowAwaitingApproval}, WorkflowApproved, true, current, "")
	if err != nil {
		return Workflow{}, err
	}
	s.publish(userID, EventApproved, workflow.ID, map[string]any{"steps": len(workflow.Steps)})
	return workflow, nil
}

// Start moves an approved workflow to running immediately. The engine would
// claim it within a tick anyway; this endpoint exists for explicitness.
func (s *Service) Start(ctx context.Context, userID, workflowID string) (Workflow, error) {
	workflow, err := s.deps.Store.Get(ctx, userID, workflowID)
	if err != nil {
		return Workflow{}, err
	}
	if workflow.Status == WorkflowRunning {
		return workflow, nil
	}
	if workflow.Status != WorkflowApproved {
		return Workflow{}, ErrNotStartable
	}
	workflow, err = s.deps.Store.Transition(ctx, userID, workflowID,
		[]WorkflowStatus{WorkflowApproved}, WorkflowRunning, false, "", "")
	if err != nil {
		return Workflow{}, err
	}
	s.publish(userID, EventStarted, workflow.ID, map[string]any{"steps": len(workflow.Steps)})
	return workflow, nil
}

// Cancel stops orchestration. Pending steps are skipped at once; a provider
// operation already running is left to settle, matching job cancellation
// semantics: stopping the workflow never un-bills in-flight provider work.
func (s *Service) Cancel(ctx context.Context, userID, workflowID string) (Workflow, error) {
	workflow, err := s.deps.Store.Get(ctx, userID, workflowID)
	if err != nil {
		return Workflow{}, err
	}
	if workflow.Status.IsTerminal() {
		return Workflow{}, fmt.Errorf("orchestrator: workflow already %s", workflow.Status)
	}
	workflow, err = s.deps.Store.Transition(ctx, userID, workflowID,
		[]WorkflowStatus{
			WorkflowDraft,
			WorkflowAwaitingClarification,
			WorkflowAwaitingApproval,
			WorkflowApproved,
			WorkflowRunning,
		}, WorkflowCancelled, false, "", "")
	if err != nil {
		return Workflow{}, err
	}
	if err := s.deps.Store.SkipPending(ctx, workflow.ID); err != nil {
		return Workflow{}, err
	}
	s.publish(userID, EventCancelled, workflow.ID, nil)
	return workflow, nil
}

// Get returns one owned workflow with its steps.
func (s *Service) Get(ctx context.Context, userID, workflowID string) (Workflow, error) {
	return s.deps.Store.Get(ctx, userID, workflowID)
}

// List returns newest-first workflows for one user.
func (s *Service) List(ctx context.Context, userID string, limit, offset int) ([]Workflow, error) {
	return s.deps.Store.List(ctx, userID, limit, offset)
}

// PlanHash canonicalizes a stored plan and hashes it. encoding/json sorts map
// keys, so the hash is stable for identical plans and differs on any change.
func PlanHash(plan map[string]any) (string, error) {
	raw, err := json.Marshal(plan)
	if err != nil {
		return "", fmt.Errorf("orchestrator: hash plan: %w", err)
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func planToMap(plan Plan) (map[string]any, error) {
	raw, err := json.Marshal(plan)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: encode plan: %w", err)
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("orchestrator: decode plan: %w", err)
	}
	return out, nil
}

func (s *Service) publish(userID, eventType, resourceID string, payload any) {
	if s.deps.Publisher == nil {
		return
	}
	event, err := realtime.NewEvent(eventType, resourceID, payload)
	if err != nil {
		slog.Error("build workflow event", "type", eventType, "workflow_id", resourceID, "error", err)
		return
	}
	s.deps.Publisher.Publish(userID, event)
}
