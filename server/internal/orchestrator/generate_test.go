package orchestrator

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

type fakeGenerate struct {
	requests []generate.Request
	keys     []string
}

func (f *fakeGenerate) Submit(_ context.Context, _ string, r generate.Request, key string) (jobs.Job, bool, error) {
	f.requests = append(f.requests, r)
	f.keys = append(f.keys, key)
	return jobs.Job{ID: "job-1", Status: jobs.StatusQueued}, true, nil
}

func generateService(gen GenerateSubmitter) (*Service, *fakeStore) {
	store := newFakeStore()
	registry := DefaultRegistry()
	service, err := NewService(Deps{
		Store: store, Planner: NewPlanner(&stubPlanClient{}, registry), Registry: registry,
		Discovery: &fakeDiscovery{status: discovery.StatusCompleted},
		Transform: &fakeTransform{}, AvatarVid: &fakeAvatarVideo{}, Generate: gen,
		Jobs:    &fakeJobs{status: jobs.StatusCompleted, result: map[string]any{"video_url": "https://cdn.example/v.mp4"}},
		Credits: AllowAll{},
	})
	if err != nil {
		panic(err)
	}
	return service, store
}

func clipPlan(args map[string]any) Plan {
	return Plan{Version: PlanVersion, Objective: "Make a clip", Steps: []PlanStep{{ID: "clip-1", Tool: "generate_video", Args: args, Needs: []string{}}}}
}

var goodArgs = map[string]any{
	"scenes": []any{
		map[string]any{"prompt": "A runner at dawn", "seconds": float64(5)},
		map[string]any{"prompt": "She sprints through a puddle", "seconds": float64(6)},
	},
	"aspect_ratio": "9:16",
	"sound":        true,
}

func TestGenerateVideoArgsAreValidatedBeforeAnythingRuns(t *testing.T) {
	registry := DefaultRegistry()
	if err := ValidatePlan(clipPlan(goodArgs), registry); err != nil {
		t.Fatalf("a good clip was refused: %v", err)
	}
	for name, bad := range map[string]map[string]any{
		"no scenes":      {"scenes": []any{}},
		"too long":       {"scenes": []any{map[string]any{"prompt": "x", "seconds": float64(40)}}},
		"unknown field":  {"scenes": goodArgs["scenes"], "model": "other"},
		"bad ratio":      {"scenes": goodArgs["scenes"], "aspect_ratio": "4:3"},
		"scene extras":   {"scenes": []any{map[string]any{"prompt": "x", "seconds": float64(5), "url": "https://evil"}}},
		"fractional len": {"scenes": []any{map[string]any{"prompt": "x", "seconds": 5.5}}},
	} {
		if err := ValidatePlan(clipPlan(bad), registry); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
}

func TestAnApprovedPlanWithoutThePlannerWaitsForApproval(t *testing.T) {
	service, store := generateService(&fakeGenerate{})
	wf, err := service.SubmitPlan(context.Background(), "user-1", clipPlan(goodArgs), "key-1")
	if err != nil || wf.Status != WorkflowAwaitingApproval || len(wf.Steps) != 1 {
		t.Fatalf("workflow = %+v err=%v", wf, err)
	}
	stored, _ := store.Get(context.Background(), "user-1", wf.ID)
	if stored.Steps[0].Tool != "generate_video" {
		t.Fatalf("steps = %+v", stored.Steps)
	}
	if _, err := service.SubmitPlan(context.Background(), "user-1", Plan{Version: PlanVersion, Objective: "x", Steps: []PlanStep{{ID: "s", Tool: "delete_everything", Args: map[string]any{}}}}, ""); err == nil {
		t.Fatal("a plan with an unknown tool was stored")
	}
}

func TestTheEngineRunsAGenerateStepOnceWithAStableKey(t *testing.T) {
	gen := &fakeGenerate{}
	service, store := generateService(gen)
	wf, err := service.SubmitPlan(context.Background(), "user-1", clipPlan(goodArgs), "key-1")
	if err != nil {
		t.Fatal(err)
	}
	stored, _ := store.Get(context.Background(), "user-1", wf.ID)
	hash, _ := PlanHash(stored.Plan)
	if _, err := service.Approve(context.Background(), "user-1", wf.ID, hash); err != nil {
		t.Fatal(err)
	}
	claimed, _ := store.Claim(context.Background(), 4, time.Minute)
	for _, item := range claimed {
		service.HandleWorkflow(context.Background(), item)
	}
	runToEnd(service, store, wf.ID)
	done, _ := store.Get(context.Background(), "user-1", wf.ID)
	if done.Status != WorkflowCompleted {
		t.Fatalf("status = %q steps=%+v", done.Status, done.Steps)
	}
	if len(gen.requests) != 1 || gen.requests[0].TotalSeconds() != 11 || !gen.requests[0].Sound || !strings.Contains(gen.keys[0], wf.ID) {
		t.Fatalf("requests=%+v keys=%v", gen.requests, gen.keys)
	}
}

func TestWithoutAGeneratorTheStepFailsInsteadOfHanging(t *testing.T) {
	service, store := generateService(nil)
	wf, _ := service.SubmitPlan(context.Background(), "user-1", clipPlan(goodArgs), "")
	stored, _ := store.Get(context.Background(), "user-1", wf.ID)
	hash, _ := PlanHash(stored.Plan)
	_, _ = service.Approve(context.Background(), "user-1", wf.ID, hash)
	claimed, _ := store.Claim(context.Background(), 4, time.Minute)
	for _, item := range claimed {
		service.HandleWorkflow(context.Background(), item)
	}
	runToEnd(service, store, wf.ID)
	if done, _ := store.Get(context.Background(), "user-1", wf.ID); done.Status != WorkflowFailed {
		t.Fatalf("status = %q, want failed", done.Status)
	}
}

// runToEnd keeps handling a workflow, as the engine's ticks would, until it ends.
func runToEnd(service *Service, store *fakeStore, id string) {
	for range 6 {
		current, _ := store.Get(context.Background(), "user-1", id)
		if current.Status.IsTerminal() {
			return
		}
		_, _ = store.Claim(context.Background(), 4, time.Minute)
		service.HandleWorkflow(context.Background(), current)
	}
}
