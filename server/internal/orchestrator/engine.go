package orchestrator

import (
	"context"
	"log/slog"
	"time"
)

// Engine timing. Claim leases a workflow; the pool timeout bounds one pass.
const (
	engineLease   = 2 * time.Minute
	engineTimeout = time.Minute
)

// EngineLease and EngineTimeout expose the timing for worker wiring.
const (
	EngineLease   = engineLease
	EngineTimeout = engineTimeout
)

// ClaimWorkflows leases due workflows for the engine pool.
func (s *Service) ClaimWorkflows(ctx context.Context, n int) ([]Workflow, error) {
	return s.deps.Store.Claim(ctx, n, engineLease)
}

// HandleWorkflow advances one claimed workflow. Errors are logged by the
// caller; a failed pass leaves the lease to expire so the next tick resumes.
func (s *Service) HandleWorkflow(ctx context.Context, workflow Workflow) {
	if err := s.advanceWorkflow(ctx, workflow); err != nil {
		slog.Error("advance workflow", "workflow_id", workflow.ID, "error", err)
	}
}

func (s *Service) advanceWorkflow(ctx context.Context, workflow Workflow) error {
	if workflow.Status == WorkflowApproved {
		var err error
		workflow, err = s.deps.Store.Transition(ctx, workflow.UserID, workflow.ID,
			[]WorkflowStatus{WorkflowApproved}, WorkflowRunning, false, "", "")
		if err != nil {
			return err
		}
		s.publish(workflow.UserID, EventStarted, workflow.ID, map[string]any{"steps": len(workflow.Steps)})
		if resumed(workflow.Steps) {
			s.publish(workflow.UserID, EventRecovered, workflow.ID, map[string]any{"resumed": true})
		}
	}
	steps := workflow.Steps
	for i := 0; i <= len(steps); i++ {
		settled, err := s.reconcileRunning(ctx, workflow, steps)
		if err != nil {
			return err
		}
		if settled {
			continue
		}
		idx := runnableIndex(steps)
		if idx < 0 {
			return s.settleWorkflow(ctx, workflow, steps)
		}
		step := &steps[idx]
		cont, err := s.executeStep(ctx, workflow, step)
		if err != nil {
			return err
		}
		if !cont {
			return nil
		}
	}
	return nil
}

// reconcileRunning revisits steps left running by an earlier pass and mirrors
// their provider records. It reports whether any step settled, which can
// unlock dependents in the same pass.
func (s *Service) reconcileRunning(ctx context.Context, workflow Workflow, steps []Step) (bool, error) {
	for i := range steps {
		step := &steps[i]
		if step.Status != StepRunning {
			continue
		}
		ref, ok := subRef(step.Output)
		if !ok {
			continue
		}
		runner, ok := s.runners[step.Tool]
		if !ok || runner.Reconcile == nil {
			continue
		}
		done, output, fail, err := runner.Reconcile(ctx, workflow, step, ref)
		if err != nil {
			return false, err
		}
		if !done {
			continue
		}
		if fail != nil {
			if ferr := s.failStep(ctx, workflow, step, fail.Error()); ferr != nil {
				return false, ferr
			}
		} else if ferr := s.finishStep(ctx, workflow, step, output, nil); ferr != nil {
			return false, ferr
		}
		return true, nil
	}
	return false, nil
}

// runnableIndex finds the first pending step whose dependencies completed,
// in plan order. Sequential execution keeps provider spend predictable.
func runnableIndex(steps []Step) int {
	done := make(map[string]bool, len(steps))
	for _, step := range steps {
		if step.Status == StepCompleted {
			done[step.StepID] = true
		}
	}
	for i, step := range steps {
		if step.Status != StepPending {
			continue
		}
		ready := true
		for _, need := range step.Needs {
			if !done[need] {
				ready = false
				break
			}
		}
		if ready {
			return i
		}
	}
	return -1
}

func (s *Service) settleWorkflow(ctx context.Context, workflow Workflow, steps []Step) error {
	for _, step := range steps {
		if step.Status == StepFailed {
			if err := s.deps.Store.SkipPending(ctx, workflow.ID); err != nil {
				return err
			}
			_, err := s.deps.Store.Transition(ctx, workflow.UserID, workflow.ID,
				[]WorkflowStatus{WorkflowRunning}, WorkflowFailed, false, "", stepError(step))
			if err != nil {
				return err
			}
			s.publish(workflow.UserID, EventFailed, workflow.ID, map[string]any{"step": step.StepID})
			return nil
		}
	}
	for _, step := range steps {
		if step.Status != StepCompleted && step.Status != StepSkipped {
			return nil
		}
	}
	_, err := s.deps.Store.Transition(ctx, workflow.UserID, workflow.ID,
		[]WorkflowStatus{WorkflowRunning}, WorkflowCompleted, false, "", "")
	if err != nil {
		return err
	}
	s.publish(workflow.UserID, EventCompleted, workflow.ID, nil)
	return nil
}

func stepError(step Step) string {
	if step.Error != "" {
		return step.Error
	}
	return "step " + step.StepID + " failed"
}

// resumed reports whether the run already started before this pass, which is
// how the engine tells a fresh start from a restart recovery.
func resumed(steps []Step) bool {
	for _, step := range steps {
		if step.Status != StepPending {
			return true
		}
	}
	return false
}
