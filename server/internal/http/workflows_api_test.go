package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
)

type fakeWorkflowService struct {
	workflow orchestrator.Workflow
	err      error
	submits  int
}

func (f *fakeWorkflowService) Submit(_ context.Context, userID, objective string, _ orchestrator.ContextView, _ string) (orchestrator.Workflow, error) {
	f.submits++
	if f.err != nil {
		return orchestrator.Workflow{}, f.err
	}
	workflow := f.workflow
	workflow.UserID = userID
	workflow.Objective = objective
	return workflow, nil
}

func (f *fakeWorkflowService) Approve(_ context.Context, userID, _, _ string) (orchestrator.Workflow, error) {
	if f.err != nil {
		return orchestrator.Workflow{}, f.err
	}
	workflow := f.workflow
	workflow.UserID = userID
	workflow.Status = orchestrator.WorkflowAwaitingApproval
	return workflow, nil
}

func (f *fakeWorkflowService) Start(_ context.Context, userID, _ string) (orchestrator.Workflow, error) {
	if f.err != nil {
		return orchestrator.Workflow{}, f.err
	}
	workflow := f.workflow
	workflow.UserID = userID
	return workflow, nil
}

func (f *fakeWorkflowService) Cancel(_ context.Context, userID, _ string) (orchestrator.Workflow, error) {
	if f.err != nil {
		return orchestrator.Workflow{}, f.err
	}
	workflow := f.workflow
	workflow.UserID = userID
	return workflow, nil
}

func (f *fakeWorkflowService) Get(_ context.Context, userID, _ string) (orchestrator.Workflow, error) {
	if f.err != nil {
		return orchestrator.Workflow{}, f.err
	}
	workflow := f.workflow
	workflow.UserID = userID
	return workflow, nil
}

func (f *fakeWorkflowService) List(_ context.Context, _ string, _, _ int) ([]orchestrator.Workflow, error) {
	if f.err != nil {
		return nil, f.err
	}
	return []orchestrator.Workflow{f.workflow}, nil
}

const workflowID = "40000000-0000-4000-8000-000000000001"

func workflowHarness(t *testing.T, svc *fakeWorkflowService) *harness {
	t.Helper()
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Workflows = svc
	h.rebuild()
	return h
}

func sampleWorkflow() orchestrator.Workflow {
	return orchestrator.Workflow{
		ID:        workflowID,
		UserID:    alice,
		Objective: "find skincare videos",
		Status:    orchestrator.WorkflowAwaitingApproval,
		Plan:      map[string]any{"version": 1},
		Context:   map[string]any{},
		Steps: []orchestrator.Step{
			{ID: "row-1", StepID: "s1", Tool: "discover_videos", Args: map[string]any{}, Status: orchestrator.StepPending, Output: map[string]any{}},
		},
	}
}

func TestOrchestratorRoutesRequireAuthentication(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{workflow: sampleWorkflow()})
	for _, path := range []string{"/api/v1/workflows", "/api/v1/workflows/" + workflowID, "/api/v1/workflows/" + workflowID + "/history"} {
		if res := h.get(path, ""); res.Code != http.StatusUnauthorized {
			t.Errorf("GET %s: expected 401, got %d", path, res.Code)
		}
	}
	for _, path := range []string{"/api/v1/workflows", "/api/v1/workflows/" + workflowID + "/approve", "/api/v1/workflows/" + workflowID + "/start", "/api/v1/workflows/" + workflowID + "/cancel"} {
		if res := h.post(path, "", `{}`); res.Code != http.StatusUnauthorized {
			t.Errorf("POST %s: expected 401, got %d", path, res.Code)
		}
	}
}

func TestSubmitWorkflow(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{workflow: sampleWorkflow()})
	token := h.token(t, alice)

	res := h.post("/api/v1/workflows", token, `{"objective":"find skincare videos"}`)
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body)
	}
	var body struct {
		Data orchestrator.Workflow `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if body.Data.Objective != "find skincare videos" || body.Data.UserID != alice {
		t.Fatalf("ownership must come from the token: %s", res.Body)
	}

	for name, payload := range map[string]string{
		"empty":         `{}`,
		"blank":         `{"objective":"   "}`,
		"not json":      `nope`,
		"unknown field": `{"objective":"x","user_id":"` + bob + `"}`,
	} {
		if res := h.post("/api/v1/workflows", token, payload); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", name, res.Code)
		}
	}
	if res := h.post("/api/v1/workflows", token, `{"objective":"`+strings.Repeat("x", orchestrator.MaxRequestRunes+1)+`"}`); res.Code != http.StatusBadRequest {
		t.Errorf("oversized objective: expected 400, got %d", res.Code)
	}
}

func TestSubmitWorkflowRespectsCap(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{err: orchestrator.ErrTooManyWorkflows})
	res := h.post("/api/v1/workflows", h.token(t, alice), `{"objective":"x"}`)
	if res.Code != http.StatusTooManyRequests || res.Header().Get("Retry-After") == "" {
		t.Fatalf("expected 429 with Retry-After, got %d", res.Code)
	}
}

func TestSubmitWorkflowModelOutageIs502(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{err: errors.New("model down")})
	res := h.post("/api/v1/workflows", h.token(t, alice), `{"objective":"x"}`)
	if res.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d", res.Code)
	}
}

func TestApproveWorkflow(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{workflow: sampleWorkflow()})
	token := h.token(t, alice)
	hash := strings.Repeat("a", 64)

	res := h.post("/api/v1/workflows/"+workflowID+"/approve", token, `{"plan_hash":"`+hash+`"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body)
	}
	for name, payload := range map[string]string{
		"short hash": `{"plan_hash":"abc"}`,
		"missing":    `{}`,
	} {
		if res := h.post("/api/v1/workflows/"+workflowID+"/approve", token, payload); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", name, res.Code)
		}
	}
	if res := h.post("/api/v1/workflows/not-a-uuid/approve", token, `{"plan_hash":"`+hash+`"}`); res.Code != http.StatusBadRequest {
		t.Errorf("malformed id: expected 400, got %d", res.Code)
	}

	changed := workflowHarness(t, &fakeWorkflowService{err: orchestrator.ErrPlanChanged})
	if res := changed.post("/api/v1/workflows/"+workflowID+"/approve", changed.token(t, alice), `{"plan_hash":"`+hash+`"}`); res.Code != http.StatusConflict {
		t.Errorf("changed plan: expected 409, got %d", res.Code)
	}
}

func TestWorkflowReadsAreOwnerScoped(t *testing.T) {
	svc := &fakeWorkflowService{workflow: sampleWorkflow()}
	h := workflowHarness(t, svc)

	res := h.get("/api/v1/workflows/"+workflowID, h.token(t, alice))
	if res.Code != http.StatusOK {
		t.Fatalf("own workflow: %d", res.Code)
	}
	svc.err = jobs.ErrNotFound
	foreign := h.get("/api/v1/workflows/"+workflowID, h.token(t, alice))
	if foreign.Code != http.StatusNotFound {
		t.Fatalf("missing workflow: expected 404, got %d", foreign.Code)
	}
	if res := h.get("/api/v1/workflows/not-a-uuid", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: expected 400, got %d", res.Code)
	}

	steps := h.get("/api/v1/workflows/"+workflowID+"/history", h.token(t, alice))
	if steps.Code != http.StatusNotFound {
		t.Fatalf("history of missing workflow: expected 404, got %d", steps.Code)
	}
}

func TestWorkflowStepDetail(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{workflow: sampleWorkflow()})
	token := h.token(t, alice)

	res := h.get("/api/v1/workflows/"+workflowID+"/steps/s1", token)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/workflows/"+workflowID+"/steps/nope", token); res.Code != http.StatusNotFound {
		t.Errorf("unknown step: expected 404, got %d", res.Code)
	}
}

func TestStartAndCancelWorkflow(t *testing.T) {
	h := workflowHarness(t, &fakeWorkflowService{workflow: sampleWorkflow()})
	token := h.token(t, alice)

	if res := h.post("/api/v1/workflows/"+workflowID+"/start", token, `{}`); res.Code != http.StatusOK {
		t.Fatalf("start: expected 200, got %d: %s", res.Code, res.Body)
	}
	if res := h.post("/api/v1/workflows/"+workflowID+"/cancel", token, `{}`); res.Code != http.StatusOK {
		t.Fatalf("cancel: expected 200, got %d: %s", res.Code, res.Body)
	}

	terminal := workflowHarness(t, &fakeWorkflowService{err: errors.New("workflow already cancelled")})
	if res := terminal.post("/api/v1/workflows/"+workflowID+"/cancel", terminal.token(t, alice), `{}`); res.Code != http.StatusConflict {
		t.Errorf("cancel terminal: expected 409, got %d", res.Code)
	}
}
