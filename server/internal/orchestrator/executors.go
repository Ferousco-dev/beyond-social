package orchestrator

import (
	"context"
	"errors"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

// executeStep runs one runnable step. It returns cont=false when the step
// submitted background work and the pass should end, letting the lease pace
// provider spend. Read-only steps finish inline and chain within one pass.
func (s *Service) executeStep(ctx context.Context, workflow Workflow, step *Step) (bool, error) {
	tool, ok := s.deps.Registry.Get(step.Tool)
	if !ok {
		return s.markTerminal(ctx, workflow, step, "unregistered tool")
	}
	if tool.Billable {
		if err := s.deps.Credits.Check(ctx, workflow.UserID, tool.Name, true); err != nil {
			return s.markTerminal(ctx, workflow, step, s.safeText(ctx, workflow, step, err))
		}
	}
	if step.Status == StepRunning && step.StartedAt != nil && time.Since(*step.StartedAt) > stuckStepAge {
		return s.markTerminal(ctx, workflow, step, "step did not settle in time")
	}
	switch tool.Name {
	case "get_job_status":
		output, err := s.readJob(ctx, workflow.UserID, step)
		return true, s.finishStep(ctx, workflow, step, output, err)
	case "get_workflow_status":
		output, err := s.readWorkflow(ctx, workflow.UserID, step)
		return true, s.finishStep(ctx, workflow, step, output, err)
	case "discover_videos":
		return s.submitOrReconcile(ctx, workflow, step, s.submitDiscovery, s.reconcileDiscovery)
	case "transform_video":
		return s.submitOrReconcile(ctx, workflow, step, s.submitTransform, s.reconcileJob)
	case "create_avatar_video":
		return s.submitOrReconcile(ctx, workflow, step, s.submitAvatarVideo, s.reconcileJob)
	default:
		return s.markTerminal(ctx, workflow, step, "unsupported tool")
	}
}

// markTerminal fails a step that can never proceed and chains within the pass,
// so the workflow settles without waiting for another tick.
func (s *Service) markTerminal(ctx context.Context, workflow Workflow, step *Step, message string) (bool, error) {
	if err := s.failStep(ctx, workflow, step, message); err != nil {
		return false, err
	}
	return true, nil
}

// submitOrReconcile submits provider work once, then reconciles it on later
// passes. The idempotency key is stable per workflow step, so a retried pass
// replays into the original sub-record instead of spending twice.
func (s *Service) submitOrReconcile(
	ctx context.Context,
	workflow Workflow,
	step *Step,
	submit func(ctx context.Context, workflow Workflow, step *Step, key string) (string, map[string]any, error),
	reconcile func(ctx context.Context, workflow Workflow, step *Step, ref string) (done bool, output map[string]any, fail, err error),
) (bool, error) {
	if ref, ok := subRef(step.Output); ok {
		done, output, fail, err := reconcile(ctx, workflow, step, ref)
		if err != nil {
			return false, err
		}
		if !done {
			return false, nil
		}
		if fail != nil {
			return true, s.finishStep(ctx, workflow, step, nil, fail)
		}
		return true, s.finishStep(ctx, workflow, step, output, nil)
	}
	key := "wf:" + workflow.ID + ":" + step.StepID
	_, output, err := submit(ctx, workflow, step, key)
	if err != nil {
		if terminalSubmitError(err) {
			return true, s.finishStep(ctx, workflow, step, nil, err)
		}
		return false, err
	}
	if err := s.markRunning(ctx, workflow, step, output); err != nil {
		return false, err
	}
	return false, nil
}

func (s *Service) markRunning(ctx context.Context, workflow Workflow, step *Step, output map[string]any) error {
	if err := s.deps.Store.UpdateStep(ctx, workflow.ID, step.StepID, StepRunning, output, ""); err != nil {
		return err
	}
	step.Status = StepRunning
	step.Output = output
	step.Attempts++
	s.publish(workflow.UserID, EventStepStarted, workflow.ID, map[string]any{"step": step.StepID, "tool": step.Tool})
	return nil
}

func (s *Service) finishStep(ctx context.Context, workflow Workflow, step *Step, output map[string]any, err error) error {
	if err != nil {
		return s.failStep(ctx, workflow, step, s.safeText(ctx, workflow, step, err))
	}
	if err := s.deps.Store.UpdateStep(ctx, workflow.ID, step.StepID, StepCompleted, output, ""); err != nil {
		return err
	}
	step.Status = StepCompleted
	step.Output = output
	s.publish(workflow.UserID, EventStepCompleted, workflow.ID, map[string]any{"step": step.StepID, "tool": step.Tool})
	return nil
}

func (s *Service) failStep(ctx context.Context, workflow Workflow, step *Step, message string) error {
	if err := s.deps.Store.UpdateStep(ctx, workflow.ID, step.StepID, StepFailed, nil, message); err != nil {
		return err
	}
	step.Status = StepFailed
	step.Error = message
	s.publish(workflow.UserID, EventStepFailed, workflow.ID, map[string]any{"step": step.StepID, "error": message})
	return nil
}

// subRef reads the provider record id a previous pass stored in step output.
func subRef(output map[string]any) (string, bool) {
	raw, ok := output["ref"]
	if !ok {
		return "", false
	}
	ref, ok := raw.(string)
	return ref, ok && ref != ""
}

// terminalSubmitError classifies submit failures that retrying cannot fix:
// bad input, foreign resources, or busy caps. Anything else returns as an
// error so the next pass retries without marking the step.
func terminalSubmitError(err error) bool {
	return errors.Is(err, discovery.ErrInvalid) ||
		errors.Is(err, discovery.ErrTooManyBusy) ||
		errors.Is(err, transform.ErrInvalid) ||
		errors.Is(err, transform.ErrVideoNotFound) ||
		errors.Is(err, transform.ErrTooManyBusy) ||
		errors.Is(err, avatarvideo.ErrInvalid) ||
		errors.Is(err, avatarvideo.ErrAvatarNotFound) ||
		errors.Is(err, avatarvideo.ErrAvatarNotReady) ||
		errors.Is(err, avatarvideo.ErrVoiceNotAllowed) ||
		errors.Is(err, avatarvideo.ErrNoVoice) ||
		errors.Is(err, avatarvideo.ErrTooManyBusy)
}

func (s *Service) readJob(ctx context.Context, userID string, step *Step) (map[string]any, error) {
	job, err := s.deps.Jobs.Get(ctx, userID, strArg(step.Args, "job_id"))
	if err != nil {
		if errors.Is(err, jobs.ErrNotFound) {
			return nil, errors.New("job not found")
		}
		return nil, err
	}
	return map[string]any{
		"job_id":   job.ID,
		"status":   string(job.Status),
		"stage":    job.Stage,
		"progress": job.Progress,
		"error":    job.Error,
	}, nil
}

func (s *Service) readWorkflow(ctx context.Context, userID string, step *Step) (map[string]any, error) {
	workflow, err := s.deps.Store.Get(ctx, userID, strArg(step.Args, "workflow_id"))
	if err != nil {
		return nil, errors.New("workflow not found")
	}
	states := make([]map[string]any, 0, len(workflow.Steps))
	for _, item := range workflow.Steps {
		states = append(states, map[string]any{"id": item.StepID, "tool": item.Tool, "status": string(item.Status)})
	}
	return map[string]any{"workflow_id": workflow.ID, "status": string(workflow.Status), "steps": states}, nil
}

func (s *Service) submitDiscovery(ctx context.Context, workflow Workflow, step *Step, _ string) (string, map[string]any, error) {
	params := discovery.Params{
		Platform: video.Platform(strArg(step.Args, "platform")),
		Query:    strArg(step.Args, "query"),
		URL:      strArg(step.Args, "url"),
		Limit:    intArg(step.Args, "limit", discovery.DefaultLimit),
	}
	found, err := s.deps.Discovery.Create(ctx, workflow.UserID, params)
	if err != nil {
		return "", nil, err
	}
	return found.ID, map[string]any{"ref": found.ID}, nil
}

func (s *Service) reconcileDiscovery(ctx context.Context, workflow Workflow, step *Step, ref string) (bool, map[string]any, error, error) {
	found, err := s.deps.Discovery.Get(ctx, workflow.UserID, ref)
	if err != nil {
		return false, nil, nil, err
	}
	switch {
	case found.Status == discovery.StatusCompleted:
		return true, map[string]any{"ref": ref, "result_count": found.ResultCount}, nil, nil
	case found.Status == discovery.StatusFailed:
		return true, nil, errors.New(firstNonEmpty(found.Error, "discovery failed")), nil
	default:
		return false, nil, nil, nil
	}
}

func (s *Service) submitTransform(ctx context.Context, workflow Workflow, step *Step, key string) (string, map[string]any, error) {
	job, _, err := s.deps.Transform.Submit(ctx, workflow.UserID,
		strArg(step.Args, "video_id"), strArg(step.Args, "prompt"), key)
	if err != nil {
		return "", nil, err
	}
	return job.ID, map[string]any{"ref": job.ID}, nil
}

func (s *Service) submitAvatarVideo(ctx context.Context, workflow Workflow, step *Step, key string) (string, map[string]any, error) {
	job, _, err := s.deps.AvatarVid.Submit(ctx, workflow.UserID, avatarvideo.SubmitInput{
		AvatarID:       strArg(step.Args, "avatar_id"),
		Script:         strArg(step.Args, "script"),
		IdempotencyKey: key,
	})
	if err != nil {
		return "", nil, err
	}
	return job.ID, map[string]any{"ref": job.ID}, nil
}

// reconcileJob mirrors a provider job into the step. completed and ready are
// both terminal successes in the jobs machine; anything else running waits.
func (s *Service) reconcileJob(ctx context.Context, workflow Workflow, step *Step, ref string) (bool, map[string]any, error, error) {
	job, err := s.deps.Jobs.Get(ctx, workflow.UserID, ref)
	if err != nil {
		if errors.Is(err, jobs.ErrNotFound) {
			return true, nil, errors.New("job not found"), nil
		}
		return false, nil, nil, err
	}
	switch job.Status {
	case jobs.StatusCompleted, jobs.StatusReady:
		return true, map[string]any{"ref": ref, "status": string(job.Status), "result": job.Result}, nil, nil
	case jobs.StatusFailed:
		return true, nil, errors.New(firstNonEmpty(job.Error, "job failed")), nil
	default:
		return false, nil, nil, nil
	}
}

func strArg(args map[string]any, key string) string {
	value, _ := args[key].(string)
	return value
}

func intArg(args map[string]any, key string, def int) int {
	value, ok := args[key].(float64)
	if !ok || value < 1 {
		return def
	}
	return int(value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

// safeText is what a user may be shown about a failed step. A provider failure
// becomes the generic message (and is reported to operators if only they can
// fix it); provider text, keys and quota details never leave the server.
func (s *Service) safeText(ctx context.Context, workflow Workflow, step *Step, err error) string {
	var pe *provider.Error
	if errors.As(err, &pe) {
		alerts.Report(ctx, s.deps.Alerts, err, alerts.Context{Source: "workflow step " + step.Tool, UserID: workflow.UserID, Resource: workflow.ID})
		return provider.UserMessage
	}
	return err.Error()
}
