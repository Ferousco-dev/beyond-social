package orchestrator

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type fakePosts struct {
	requests []publish.Request
	keys     []string
	err      error
}

func (f *fakePosts) Schedule(_ context.Context, _ string, r publish.Request, key string) (publish.Post, bool, error) {
	f.requests = append(f.requests, r)
	f.keys = append(f.keys, key)
	return publish.Post{ID: "post-1", Platform: r.Platform}, true, f.err
}

func postService(posts PostScheduler) (*Service, *fakeStore) {
	store := newFakeStore()
	registry := DefaultRegistry()
	service, err := NewService(Deps{
		Store: store, Planner: NewPlanner(&stubPlanClient{}, registry), Registry: registry,
		Discovery: &fakeDiscovery{status: discovery.StatusCompleted},
		Transform: &fakeTransform{}, AvatarVid: &fakeAvatarVideo{}, Generate: &fakeGenerate{}, Posts: posts,
		Jobs:    &fakeJobs{status: jobs.StatusCompleted, result: map[string]any{"video_url": "https://cdn.example/v.mp4"}},
		Credits: AllowAll{},
	})
	if err != nil {
		panic(err)
	}
	return service, store
}

func clipThenPost(post map[string]any) Plan {
	return Plan{Version: PlanVersion, Objective: "Make and post", Steps: []PlanStep{
		{ID: "clip-1", Tool: "generate_video", Args: goodArgs, Needs: []string{}},
		{ID: "post", Tool: "schedule_post", Args: post, Needs: []string{"clip-1"}},
	}}
}

var goodPost = map[string]any{"platform": "youtube", "caption": "Rise early", "video_from": "clip-1", "at": "2026-10-14T18:00:00+01:00"}

func TestPostArgsAreCheckedBeforeAnythingRuns(t *testing.T) {
	if _, err := ParsePostArgs(goodPost); err != nil {
		t.Fatalf("a good post was refused: %v", err)
	}
	for name, mutate := range map[string]func(map[string]any){
		"unknown platform":     func(a map[string]any) { a["platform"] = "myspace" },
		"unknown field":        func(a map[string]any) { a["url"] = "https://evil" },
		"both videos":          func(a map[string]any) { a["job_id"] = "job-1" },
		"no video":             func(a map[string]any) { delete(a, "video_from") },
		"time without zone":    func(a map[string]any) { a["at"] = "2026-10-14 18:00" },
		"no caption on tiktok": func(a map[string]any) { a["platform"] = "tiktok"; a["caption"] = " " },
	} {
		args := map[string]any{}
		for k, v := range goodPost {
			args[k] = v
		}
		mutate(args)
		if _, err := ParsePostArgs(args); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
}

func TestAPlanThatPostsAlwaysWaitsForApprovalEvenWithoutAnyCharge(t *testing.T) {
	registry := DefaultRegistry()
	justPost := Plan{Version: PlanVersion, Objective: "Post", Steps: []PlanStep{{ID: "post", Tool: "schedule_post", Args: map[string]any{"platform": "youtube", "caption": "x", "job_id": "job-1"}, Needs: []string{}}}}
	if err := ValidatePlan(justPost, registry); err != nil {
		t.Fatal(err)
	}
	if !justPost.RequiresApproval(registry) {
		t.Fatal("a post to a public account must never start without approval")
	}
}

func approveAndRun(t *testing.T, service *Service, store *fakeStore, plan Plan) Workflow {
	t.Helper()
	wf, err := service.SubmitPlan(context.Background(), "user-1", plan, "key")
	if err != nil {
		t.Fatal(err)
	}
	stored, _ := store.Get(context.Background(), "user-1", wf.ID)
	hash, _ := PlanHash(stored.Plan)
	if _, err := service.Approve(context.Background(), "user-1", wf.ID, hash); err != nil {
		t.Fatal(err)
	}
	claimed, _ := store.Claim(context.Background(), 4, 0)
	for _, item := range claimed {
		service.HandleWorkflow(context.Background(), item)
	}
	runToEnd(service, store, wf.ID)
	done, _ := store.Get(context.Background(), "user-1", wf.ID)
	return done
}

func TestThePostStepUsesTheVideoTheEarlierStepMade(t *testing.T) {
	posts := &fakePosts{}
	service, store := postService(posts)
	done := approveAndRun(t, service, store, clipThenPost(goodPost))
	if done.Status != WorkflowCompleted {
		t.Fatalf("status = %q steps=%+v", done.Status, done.Steps)
	}
	if len(posts.requests) != 1 || posts.requests[0].JobID != "job-1" || posts.requests[0].Platform != social.YouTube || posts.requests[0].Caption != "Rise early" || posts.requests[0].At == nil {
		t.Fatalf("requests = %+v", posts.requests)
	}
	if posts.keys[0] != "wf:"+done.ID+":post" {
		t.Fatalf("key = %q", posts.keys[0])
	}
	if done.Steps[1].Output["post_id"] != "post-1" {
		t.Fatalf("output = %+v", done.Steps[1].Output)
	}
}

func TestAPostThatCannotBeScheduledFailsTheStepWithAReadableReason(t *testing.T) {
	for name, failure := range map[string]error{
		"not connected": social.ErrNotConnected,
		"reconnect":     social.ErrReconnect,
		"invalid":       publish.ErrInvalid,
	} {
		posts := &fakePosts{err: failure}
		service, store := postService(posts)
		done := approveAndRun(t, service, store, clipThenPost(goodPost))
		if done.Status != WorkflowFailed || done.Steps[1].Error == "" {
			t.Errorf("%s: status=%q steps=%+v", name, done.Status, done.Steps)
		}
	}
}

func TestWithoutAPostServiceTheStepFailsInsteadOfHanging(t *testing.T) {
	service, store := postService(nil)
	if done := approveAndRun(t, service, store, clipThenPost(goodPost)); done.Status != WorkflowFailed {
		t.Fatalf("status = %q", done.Status)
	}
}
