package httpserver

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/google/uuid"
)

// WorkflowService is the orchestrator surface the API exposes. It keeps this
// package decoupled from engine construction for tests.
type WorkflowService interface {
	Submit(ctx context.Context, userID, objective string, view orchestrator.ContextView, idempotencyKey string) (orchestrator.Workflow, error)
	Approve(ctx context.Context, userID, workflowID, planHash string) (orchestrator.Workflow, error)
	Start(ctx context.Context, userID, workflowID string) (orchestrator.Workflow, error)
	Cancel(ctx context.Context, userID, workflowID string) (orchestrator.Workflow, error)
	Get(ctx context.Context, userID, workflowID string) (orchestrator.Workflow, error)
	List(ctx context.Context, userID string, limit, offset int) ([]orchestrator.Workflow, error)
}

type workflowSubmitRequest struct {
	Objective string `json:"objective"`
	Context   struct {
		Summary  string `json:"summary"`
		Workflow string `json:"workflow"`
		Turns    []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"turns"`
	} `json:"context"`
}

func cleanObjective(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	runes := utf8.RuneCountInString(trimmed)
	if runes == 0 || runes > orchestrator.MaxRequestRunes {
		return "", false
	}
	if strings.IndexFunc(trimmed, func(r rune) bool { return unicode.IsControl(r) && r != '\n' && r != '\t' }) >= 0 {
		return "", false
	}
	return trimmed, true
}

// submitWorkflow plans a natural-language request and persists the workflow.
func (a *App) submitWorkflow(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req workflowSubmitRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	objective, valid := cleanObjective(req.Objective)
	if !valid {
		writeError(w, http.StatusBadRequest, "invalid_request", "objective must be 1-2000 characters of plain text")
		return
	}
	view := orchestrator.ContextView{Summary: req.Context.Summary, Workflow: req.Context.Workflow}
	for _, turn := range req.Context.Turns {
		if len(view.Turns) >= orchestrator.MaxContextTurns {
			break
		}
		view.Turns = append(view.Turns, orchestrator.ContextTurn{Role: turn.Role, Content: turn.Content})
	}
	workflow, err := a.deps.Workflows.Submit(r.Context(), identity.UserID, objective, view, r.Header.Get("Idempotency-Key"))
	switch {
	case errors.Is(err, orchestrator.ErrTooManyWorkflows):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many active workflows; wait for one to finish")
	case err != nil:
		writeWorkflowError(w, err)
	default:
		writeData(w, http.StatusAccepted, workflow)
	}
}

type workflowApproveRequest struct {
	PlanHash string `json:"plan_hash"`
}

// approveWorkflow binds the user's approval to the exact plan they previewed.
func (a *App) approveWorkflow(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "workflow id must be a UUID")
		return
	}
	var req workflowApproveRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if len(req.PlanHash) != 64 {
		writeError(w, http.StatusBadRequest, "invalid_request", "plan_hash must be the 64-character hash from the workflow preview")
		return
	}
	workflow, err := a.deps.Workflows.Approve(r.Context(), identity.UserID, id, strings.ToLower(req.PlanHash))
	switch {
	case errors.Is(err, orchestrator.ErrNotApprovable):
		writeError(w, http.StatusConflict, "not_approvable", "workflow is not awaiting approval")
	case errors.Is(err, orchestrator.ErrPlanChanged):
		writeError(w, http.StatusConflict, "plan_changed", "the plan changed since preview; review it again before approving")
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "workflow not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, workflow)
	}
}

// startWorkflow moves an approved workflow to running immediately.
func (a *App) startWorkflow(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "workflow id must be a UUID")
		return
	}
	workflow, err := a.deps.Workflows.Start(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, orchestrator.ErrNotStartable):
		writeError(w, http.StatusConflict, "not_startable", "only approved workflows can start")
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "workflow not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, workflow)
	}
}

// cancelWorkflow stops orchestration. Provider work already running is left
// to settle, so cancellation is immediate but never un-bills in-flight work.
func (a *App) cancelWorkflow(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "workflow id must be a UUID")
		return
	}
	workflow, err := a.deps.Workflows.Cancel(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "workflow not found")
	case err != nil:
		writeError(w, http.StatusConflict, "not_cancellable", err.Error())
	default:
		writeData(w, http.StatusOK, workflow)
	}
}

func (a *App) listWorkflows(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, offset, ok := pageParams(w, r)
	if !ok {
		return
	}
	workflows, err := a.deps.Workflows.List(r.Context(), identity.UserID, limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if workflows == nil {
		workflows = []orchestrator.Workflow{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":       workflows,
		"pagination": pagination{Limit: limit, Offset: offset, HasMore: len(workflows) == limit},
	})
}

func (a *App) getWorkflow(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "workflow id must be a UUID")
		return
	}
	workflow, err := a.deps.Workflows.Get(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "workflow not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, workflow)
	}
}

// getWorkflowHistory returns the execution record: every step with its state,
// output, and error. State changes persist before their events broadcast, so
// this is what a reconnected client replays from.
func (a *App) getWorkflowHistory(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "workflow id must be a UUID")
		return
	}
	workflow, err := a.deps.Workflows.Get(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "workflow not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, workflow.Steps)
	}
}

// getWorkflowStep returns one step's status and output.
func (a *App) getWorkflowStep(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "workflow id must be a UUID")
		return
	}
	workflow, err := a.deps.Workflows.Get(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "workflow not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		for _, step := range workflow.Steps {
			if step.StepID == r.PathValue("step") {
				writeData(w, http.StatusOK, step)
				return
			}
		}
		writeError(w, http.StatusNotFound, "not_found", "step not found")
	}
}

// writeWorkflowError maps planning failures. A model outage is a 502: the
// request was valid, the provider was not.
func writeWorkflowError(w http.ResponseWriter, err error) {
	if errors.Is(err, orchestrator.ErrTooManyWorkflows) {
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many active workflows; wait for one to finish")
		return
	}
	writeError(w, http.StatusBadGateway, "provider_unavailable", "workflow planning is unavailable right now")
}
