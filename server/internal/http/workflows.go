package httpserver

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/google/uuid"
)

// WorkflowService is the orchestrator surface the API exposes. It keeps this
// package decoupled from engine construction for tests.
type WorkflowService interface {
	Approve(ctx context.Context, userID, workflowID, planHash string) (orchestrator.Workflow, error)
	Start(ctx context.Context, userID, workflowID string) (orchestrator.Workflow, error)
	Cancel(ctx context.Context, userID, workflowID string) (orchestrator.Workflow, error)
	Get(ctx context.Context, userID, workflowID string) (orchestrator.Workflow, error)
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
