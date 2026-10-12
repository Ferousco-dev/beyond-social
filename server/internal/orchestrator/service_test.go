package orchestrator

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

type fakeStore struct {
	mu        sync.Mutex
	workflows map[string]*Workflow
	active    int
}

func newFakeStore() *fakeStore {
	return &fakeStore{workflows: make(map[string]*Workflow)}
}

func (f *fakeStore) Create(_ context.Context, userID, objective string, plan map[string]any, steps []StepRecord, _, status string) (Workflow, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	id := "wf-" + objective
	if existing, ok := f.workflows[id]; ok {
		return *existing, false, nil
	}
	records := make([]Step, 0, len(steps))
	for _, step := range steps {
		records = append(records, Step{ID: "row-" + step.StepID, StepID: step.StepID, Tool: step.Tool, Args: step.Args, Needs: step.Needs, Status: StepPending, Output: map[string]any{}})
	}
	workflow := &Workflow{ID: id, UserID: userID, Objective: objective, Status: WorkflowStatus(status), Plan: plan, Context: map[string]any{}, Steps: records}
	f.workflows[id] = workflow
	return *workflow, true, nil
}

func (f *fakeStore) Get(_ context.Context, userID, id string) (Workflow, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	workflow, ok := f.workflows[id]
	if !ok || workflow.UserID != userID {
		return Workflow{}, jobs.ErrNotFound
	}
	return *workflow, nil
}

func (f *fakeStore) List(_ context.Context, _ string, _, _ int) ([]Workflow, error) {
	return nil, nil
}

func (f *fakeStore) CountActive(_ context.Context, _ string) (int, error) {
	return f.active, nil
}

func (f *fakeStore) Transition(_ context.Context, userID, id string, from []WorkflowStatus, to WorkflowStatus, setPlanHash bool, planHash, errorMessage string) (Workflow, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	workflow, ok := f.workflows[id]
	if !ok || workflow.UserID != userID {
		return Workflow{}, jobs.ErrNotFound
	}
	allowed := false
	for _, status := range from {
		if workflow.Status == status {
			allowed = true
		}
	}
	if !allowed {
		return Workflow{}, errors.New("bad transition")
	}
	workflow.Status = to
	if setPlanHash {
		workflow.PlanHash = planHash
	}
	if errorMessage != "" {
		workflow.Error = errorMessage
	}
	now := time.Now().UTC()
	if to == WorkflowApproved {
		workflow.ApprovedAt = &now
	}
	return *workflow, nil
}

func (f *fakeStore) UpdateStep(_ context.Context, workflowID, stepID string, status StepStatus, output map[string]any, errorMessage string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	workflow, ok := f.workflows[workflowID]
	if !ok {
		return jobs.ErrNotFound
	}
	for i := range workflow.Steps {
		if workflow.Steps[i].StepID != stepID {
			continue
		}
		workflow.Steps[i].Status = status
		if output != nil {
			workflow.Steps[i].Output = output
		}
		if errorMessage != "" {
			workflow.Steps[i].Error = errorMessage
		}
		if status == StepRunning {
			workflow.Steps[i].Attempts++
		}
		now := time.Now().UTC()
		if status == StepRunning && workflow.Steps[i].StartedAt == nil {
			workflow.Steps[i].StartedAt = &now
		}
		return nil
	}
	return jobs.ErrNotFound
}

func (f *fakeStore) SkipPending(_ context.Context, workflowID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	workflow, ok := f.workflows[workflowID]
	if !ok {
		return jobs.ErrNotFound
	}
	for i := range workflow.Steps {
		if workflow.Steps[i].Status == StepPending {
			workflow.Steps[i].Status = StepSkipped
		}
	}
	return nil
}

func (f *fakeStore) Claim(_ context.Context, _ int, _ time.Duration) ([]Workflow, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []Workflow
	for _, workflow := range f.workflows {
		if workflow.Status == WorkflowApproved || workflow.Status == WorkflowRunning {
			out = append(out, *workflow)
		}
	}
	return out, nil
}

type fakePublisher struct {
	mu     sync.Mutex
	events []realtime.Event
}

func (f *fakePublisher) Publish(_ string, event realtime.Event) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, event)
}

func (f *fakePublisher) types() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	types := make([]string, 0, len(f.events))
	for _, event := range f.events {
		types = append(types, event.Type)
	}
	return types
}

type fakeDiscovery struct {
	mu      sync.Mutex
	status  discovery.Status
	count   int
	submits int
}

func (f *fakeDiscovery) Create(_ context.Context, _ string, _ discovery.Params) (discovery.Discovery, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.submits++
	return discovery.Discovery{ID: "disc-1", Status: discovery.StatusQueued}, nil
}

func (f *fakeDiscovery) Get(_ context.Context, _, _ string) (discovery.Discovery, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return discovery.Discovery{ID: "disc-1", Status: f.status, ResultCount: f.count}, nil
}

type fakeJobs struct {
	mu     sync.Mutex
	status jobs.Status
	errMsg string
	result map[string]any
}

func (f *fakeJobs) Get(_ context.Context, _, _ string) (jobs.Job, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return jobs.Job{ID: "job-1", Status: f.status, Error: f.errMsg, Result: f.result}, nil
}

type fakeTransform struct {
	submits int
}

func (f *fakeTransform) Submit(_ context.Context, _, _, _, _ string) (jobs.Job, bool, error) {
	f.submits++
	return jobs.Job{ID: "job-1", Status: jobs.StatusQueued}, true, nil
}

type fakeAvatarVideo struct {
	submits int
}

func (f *fakeAvatarVideo) Submit(_ context.Context, _ string, _ avatarvideo.SubmitInput) (jobs.Job, bool, error) {
	f.submits++
	return jobs.Job{ID: "job-1", Status: jobs.StatusQueued}, true, nil
}

func testService(planner PlanClient, credits CreditsChecker) (*Service, *fakeStore, *fakePublisher, *fakeDiscovery, *fakeJobs) {
	store := newFakeStore()
	publisher := &fakePublisher{}
	discoverySvc := &fakeDiscovery{status: discovery.StatusCompleted, count: 3}
	jobsSvc := &fakeJobs{status: jobs.StatusCompleted, result: map[string]any{"video_url": "https://cdn.example/v.mp4"}}
	registry := DefaultRegistry()
	service, err := NewService(Deps{
		Store:     store,
		Planner:   NewPlanner(planner, registry),
		Registry:  registry,
		Discovery: discoverySvc,
		Transform: &fakeTransform{},
		AvatarVid: &fakeAvatarVideo{},
		Jobs:      jobsSvc,
		Publisher: publisher,
		Credits:   credits,
	})
	if err != nil {
		panic(err)
	}
	return service, store, publisher, discoverySvc, jobsSvc
}

const twoStepPlan = `{"version":1,"objective":"Find and transform","missing_info":[],"unsupported":[],"steps":[
{"id":"s1","tool":"discover_videos","args":{"platform":"tiktok","query":"skincare"},"needs":[],"confirm":false},
{"id":"s2","tool":"transform_video","args":{"video_id":"vid-1","prompt":"cinematic"},"needs":["s1"],"confirm":false}]}`

func containsEvent(publisher *fakePublisher, eventType string) bool {
	for _, eventTypeGot := range publisher.types() {
		if eventTypeGot == eventType {
			return true
		}
	}
	return false
}

func TestSubmitRoutesClarification(t *testing.T) {
	service, _, publisher, _, _ := testService(&stubPlanClient{
		body: `{"version":1,"objective":"transform it","missing_info":["Which video?"],"unsupported":[],"steps":[]}`,
	}, AllowAll{})
	workflow, err := service.Submit(context.Background(), "user-1", "transform it", ContextView{}, "")
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if workflow.Status != WorkflowAwaitingClarification {
		t.Fatalf("unexpected status %q", workflow.Status)
	}
	if !containsEvent(publisher, EventAwaitingClarify) {
		t.Fatal("expected clarification event")
	}
}

func TestSubmitRoutesApprovalAndAutoApprove(t *testing.T) {
	service, _, publisher, _, _ := testService(&stubPlanClient{body: twoStepPlan}, AllowAll{})
	workflow, err := service.Submit(context.Background(), "user-1", "find and transform", ContextView{}, "")
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if workflow.Status != WorkflowAwaitingApproval {
		t.Fatalf("billable plan should await approval, got %q", workflow.Status)
	}
	if !containsEvent(publisher, EventAwaitingApproval) {
		t.Fatal("expected approval event")
	}

	readOnly := &stubPlanClient{body: `{"version":1,"objective":"check","missing_info":[],"unsupported":[],"steps":[{"id":"s1","tool":"get_job_status","args":{"job_id":"j"},"needs":[],"confirm":false}]}`}
	service2, _, _, _, _ := testService(readOnly, AllowAll{})
	auto, err := service2.Submit(context.Background(), "user-1", "check", ContextView{}, "")
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if auto.Status != WorkflowApproved {
		t.Fatalf("read-only plan should auto-approve, got %q", auto.Status)
	}
}

func TestSubmitEnforcesWorkflowCap(t *testing.T) {
	service, store, _, _, _ := testService(&stubPlanClient{body: twoStepPlan}, AllowAll{})
	store.active = MaxActiveWorkflowsPerUser
	if _, err := service.Submit(context.Background(), "user-1", "x", ContextView{}, ""); !errors.Is(err, ErrTooManyWorkflows) {
		t.Fatalf("expected cap error, got %v", err)
	}
}

func TestApproveBindsPlanHash(t *testing.T) {
	service, store, publisher, _, _ := testService(&stubPlanClient{body: twoStepPlan}, AllowAll{})
	workflow, err := service.Submit(context.Background(), "user-1", "find and transform", ContextView{}, "")
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if _, err := service.Approve(context.Background(), "user-1", workflow.ID, "wrong-hash"); !errors.Is(err, ErrPlanChanged) {
		t.Fatalf("expected plan-changed error, got %v", err)
	}
	stored, _ := store.Get(context.Background(), "user-1", workflow.ID)
	hash, err := PlanHash(stored.Plan)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	approved, err := service.Approve(context.Background(), "user-1", workflow.ID, hash)
	if err != nil {
		t.Fatalf("approve: %v", err)
	}
	if approved.Status != WorkflowApproved || approved.PlanHash != hash {
		t.Fatalf("unexpected approved state: %+v", approved)
	}
	if _, err := service.Approve(context.Background(), "user-1", workflow.ID, hash); !errors.Is(err, ErrNotApprovable) {
		t.Fatalf("expected not-approvable on replay, got %v", err)
	}
	if !containsEvent(publisher, EventApproved) {
		t.Fatal("expected approved event")
	}
}

func TestEngineRunsToCompletion(t *testing.T) {
	service, store, publisher, _, _ := testService(&stubPlanClient{body: twoStepPlan}, AllowAll{})
	workflow, err := service.Submit(context.Background(), "user-1", "find and transform", ContextView{}, "")
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	stored, _ := store.Get(context.Background(), "user-1", workflow.ID)
	hash, _ := PlanHash(stored.Plan)
	if _, err := service.Approve(context.Background(), "user-1", workflow.ID, hash); err != nil {
		t.Fatalf("approve: %v", err)
	}
	// Pass one: start, submit discovery, wait.
	claimed, _ := store.Claim(context.Background(), 4, time.Minute)
	for _, item := range claimed {
		service.HandleWorkflow(context.Background(), item)
	}
	got, _ := store.Get(context.Background(), "user-1", workflow.ID)
	if got.Status != WorkflowRunning {
		t.Fatalf("expected running, got %q", got.Status)
	}
	// Pass two: discovery reconciles complete, transform submits.
	claimed, _ = store.Claim(context.Background(), 4, time.Minute)
	_ = claimed
	current, _ := store.Get(context.Background(), "user-1", workflow.ID)
	service.HandleWorkflow(context.Background(), current)
	// Pass three: transform reconciles complete, workflow completes.
	current, _ = store.Get(context.Background(), "user-1", workflow.ID)
	service.HandleWorkflow(context.Background(), current)
	done, _ := store.Get(context.Background(), "user-1", workflow.ID)
	if done.Status != WorkflowCompleted {
		t.Fatalf("expected completed, got %q", done.Status)
	}
	for _, eventType := range []string{EventStarted, EventStepStarted, EventStepCompleted, EventCompleted} {
		if !containsEvent(publisher, eventType) {
			t.Errorf("expected event %q", eventType)
		}
	}
}

func TestEngineFailureSkipsDependents(t *testing.T) {
	service, store, _, discoverySvc, _ := testService(&stubPlanClient{body: twoStepPlan}, AllowAll{})
	discoverySvc.status = discovery.StatusFailed
	workflow, _ := service.Submit(context.Background(), "user-1", "find and transform", ContextView{}, "")
	stored, _ := store.Get(context.Background(), "user-1", workflow.ID)
	hash, _ := PlanHash(stored.Plan)
	_, _ = service.Approve(context.Background(), "user-1", workflow.ID, hash)

	current, _ := store.Get(context.Background(), "user-1", workflow.ID)
	service.HandleWorkflow(context.Background(), current)
	current, _ = store.Get(context.Background(), "user-1", workflow.ID)
	service.HandleWorkflow(context.Background(), current)
	done, _ := store.Get(context.Background(), "user-1", workflow.ID)
	if done.Status != WorkflowFailed {
		t.Fatalf("expected failed, got %q", done.Status)
	}
	for _, step := range done.Steps {
		if step.StepID == "s2" && step.Status != StepSkipped {
			t.Fatalf("dependent step should be skipped, got %q", step.Status)
		}
	}
}

func TestCancelSkipsPending(t *testing.T) {
	service, store, _, _, _ := testService(&stubPlanClient{body: twoStepPlan}, AllowAll{})
	workflow, _ := service.Submit(context.Background(), "user-1", "find and transform", ContextView{}, "")
	cancelled, err := service.Cancel(context.Background(), "user-1", workflow.ID)
	if err != nil {
		t.Fatalf("cancel: %v", err)
	}
	if cancelled.Status != WorkflowCancelled {
		t.Fatalf("expected cancelled, got %q", cancelled.Status)
	}
	stored, _ := store.Get(context.Background(), "user-1", workflow.ID)
	for _, step := range stored.Steps {
		if step.Status != StepSkipped {
			t.Fatalf("pending step should be skipped, got %q", step.Status)
		}
	}
	if _, err := service.Cancel(context.Background(), "user-1", workflow.ID); err == nil {
		t.Fatal("cancelling a terminal workflow should fail")
	}
}

func TestCreditsDenyBillableStep(t *testing.T) {
	deny := denyAll{}
	service, store, _, _, _ := testService(&stubPlanClient{body: twoStepPlan}, deny)
	workflow, _ := service.Submit(context.Background(), "user-1", "find and transform", ContextView{}, "")
	stored, _ := store.Get(context.Background(), "user-1", workflow.ID)
	hash, _ := PlanHash(stored.Plan)
	_, _ = service.Approve(context.Background(), "user-1", workflow.ID, hash)
	current, _ := store.Get(context.Background(), "user-1", workflow.ID)
	service.HandleWorkflow(context.Background(), current)
	done, _ := store.Get(context.Background(), "user-1", workflow.ID)
	if done.Status != WorkflowFailed {
		t.Fatalf("denied spend should fail the workflow, got %q", done.Status)
	}
}

type denyAll struct{}

func (denyAll) Check(_ context.Context, _, _ string, _ bool) error {
	return ErrInsufficientCredits
}
