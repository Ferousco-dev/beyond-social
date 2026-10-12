package database

import (
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/google/uuid"
)

func testWorkflowSteps() []orchestrator.StepRecord {
	return []orchestrator.StepRecord{
		{StepID: "s1", Tool: "discover_videos", Args: map[string]any{"platform": "tiktok"}, Needs: []string{}},
		{StepID: "s2", Tool: "transform_video", Args: map[string]any{"prompt": "cinematic"}, Needs: []string{"s1"}},
	}
}

func TestWorkflowCreateGetIdempotent(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewWorkflowStore(pool)
	userID := uuid.NewString()

	created, isNew, err := store.Create(ctx, userID, "make a promo", map[string]any{"version": 1}, testWorkflowSteps(), "idem-1", string(orchestrator.WorkflowDraft))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if !isNew {
		t.Fatal("first create should be new")
	}
	if len(created.Steps) != 2 {
		t.Fatalf("expected 2 steps, got %d", len(created.Steps))
	}

	replay, isNew, err := store.Create(ctx, userID, "make a promo", map[string]any{"version": 1}, testWorkflowSteps(), "idem-1", string(orchestrator.WorkflowDraft))
	if err != nil {
		t.Fatalf("replay: %v", err)
	}
	if isNew {
		t.Fatal("replay with same idempotency key must not create")
	}
	if replay.ID != created.ID {
		t.Fatal("replay should return the original workflow")
	}
}

func TestWorkflowGetIsUserScoped(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewWorkflowStore(pool)

	created, _, err := store.Create(ctx, uuid.NewString(), "promo", map[string]any{}, testWorkflowSteps(), "", string(orchestrator.WorkflowDraft))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := store.Get(ctx, uuid.NewString(), created.ID); err == nil {
		t.Fatal("foreign user must not read the workflow")
	}
	if _, err := store.Get(ctx, created.UserID, "not-a-uuid"); err == nil {
		t.Fatal("malformed id must read as not found")
	}
}

func TestWorkflowTransitionGuardsState(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewWorkflowStore(pool)
	userID := uuid.NewString()

	created, _, err := store.Create(ctx, userID, "promo", map[string]any{}, testWorkflowSteps(), "", string(orchestrator.WorkflowDraft))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := store.Transition(ctx, userID, created.ID,
		[]orchestrator.WorkflowStatus{orchestrator.WorkflowApproved},
		orchestrator.WorkflowRunning, false, "", ""); err == nil {
		t.Fatal("transition from the wrong state must fail")
	}
	moved, err := store.Transition(ctx, userID, created.ID,
		[]orchestrator.WorkflowStatus{orchestrator.WorkflowDraft},
		orchestrator.WorkflowAwaitingApproval, false, "", "")
	if err != nil {
		t.Fatalf("transition: %v", err)
	}
	if moved.Status != orchestrator.WorkflowAwaitingApproval {
		t.Fatalf("unexpected status %q", moved.Status)
	}
}

func TestWorkflowClaimLeasesDueRows(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewWorkflowStore(pool)
	userID := uuid.NewString()

	created, _, err := store.Create(ctx, userID, "promo", map[string]any{}, testWorkflowSteps(), "", string(orchestrator.WorkflowApproved))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	// Draft rows are never claimable.
	if _, _, err := store.Create(ctx, userID, "other", map[string]any{}, testWorkflowSteps(), "", string(orchestrator.WorkflowDraft)); err != nil {
		t.Fatalf("create draft: %v", err)
	}

	claimed, err := store.Claim(ctx, 10, time.Minute)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	if len(claimed) != 1 || claimed[0].ID != created.ID {
		t.Fatalf("expected only the approved workflow, got %d", len(claimed))
	}
	if len(claimed[0].Steps) != 2 {
		t.Fatalf("claimed workflow should carry its steps, got %d", len(claimed[0].Steps))
	}
	again, err := store.Claim(ctx, 10, time.Minute)
	if err != nil {
		t.Fatalf("second claim: %v", err)
	}
	if len(again) != 0 {
		t.Fatal("leased rows must not be claimed twice")
	}
}

func TestWorkflowStepUpdate(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewWorkflowStore(pool)
	userID := uuid.NewString()

	created, _, err := store.Create(ctx, userID, "promo", map[string]any{}, testWorkflowSteps(), "", string(orchestrator.WorkflowApproved))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := store.UpdateStep(ctx, created.ID, "s1", orchestrator.StepRunning, map[string]any{}, ""); err != nil {
		t.Fatalf("start step: %v", err)
	}
	if err := store.UpdateStep(ctx, created.ID, "s1", orchestrator.StepCompleted, map[string]any{"videos": 3}, ""); err != nil {
		t.Fatalf("complete step: %v", err)
	}
	got, err := store.Get(ctx, userID, created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	var step *orchestrator.Step
	for i := range got.Steps {
		if got.Steps[i].StepID == "s1" {
			step = &got.Steps[i]
		}
	}
	if step == nil {
		t.Fatal("step s1 missing")
	}
	if step.Status != orchestrator.StepCompleted || step.Attempts != 1 {
		t.Fatalf("unexpected step state: %+v", step)
	}
	if step.Output["videos"] != float64(3) {
		t.Fatalf("unexpected step output: %v", step.Output)
	}
}
