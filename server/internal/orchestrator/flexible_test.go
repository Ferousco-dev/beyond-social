package orchestrator

import (
	"context"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"google.golang.org/genai"
)

// A post that names the clip's id by reference instead of the old video_from.
var referencedPost = map[string]any{"platform": "youtube", "caption": "Rise early", "job_id": "${clip-1.ref}"}

func TestAStepCanUseWhatAnEarlierStepMade(t *testing.T) {
	posts := &fakePosts{}
	service, store := postService(posts)
	done := approveAndRun(t, service, store, clipThenPost(referencedPost))
	if done.Status != WorkflowCompleted {
		t.Fatalf("status = %q steps=%+v", done.Status, done.Steps)
	}
	if len(posts.requests) != 1 || posts.requests[0].JobID != "job-1" {
		t.Fatalf("the post did not get the clip's id: %+v", posts.requests)
	}
}

func TestReferencesAreCheckedWhenThePlanIsMade(t *testing.T) {
	registry := DefaultRegistry()
	for name, args := range map[string]map[string]any{
		"unknown step":   {"platform": "youtube", "job_id": "${nope.ref}"},
		"not a need":     {"platform": "youtube", "job_id": "${other.ref}"},
		"unknown output": {"platform": "youtube", "job_id": "${clip-1.secret}"},
	} {
		plan := clipThenPost(args)
		plan.Steps = append(plan.Steps, PlanStep{ID: "other", Tool: "generate_video", Args: goodArgs, Needs: []string{}})
		if err := ValidatePlan(plan, registry); err == nil {
			t.Errorf("%s: a bad reference was accepted", name)
		}
	}
	if err := ValidatePlan(clipThenPost(referencedPost), registry); err != nil {
		t.Fatalf("a good reference was refused: %v", err)
	}
}

func TestTheTypeOfAReferencedValueStillHasToFit(t *testing.T) {
	// The clip's id is not a time, so it cannot stand in for one.
	args := map[string]any{"platform": "youtube", "job_id": "${clip-1.ref}", "at": "${clip-1.ref}"}
	if err := ValidatePlan(clipThenPost(args), DefaultRegistry()); err == nil {
		t.Fatal("an id was accepted where a time was needed")
	}
}

func TestAStepFailsClearlyWhenWhatItNeedsWasNotMade(t *testing.T) {
	posts := &fakePosts{}
	service, store := postService(posts)
	plan := clipThenPost(map[string]any{"platform": "youtube", "job_id": "${clip-1.result.thumbnail_url}"})
	plan.Steps[1].Args["caption"] = "x"
	done := approveAndRun(t, service, store, plan)
	// The test job has a video_url but no thumbnail, so there is nothing to pass on.
	if done.Status != WorkflowFailed || len(posts.requests) != 0 {
		t.Fatalf("status %q posts %d", done.Status, len(posts.requests))
	}
	if !strings.Contains(done.Steps[1].Error, "did not make what it needs") {
		t.Fatalf("error = %q", done.Steps[1].Error)
	}
}

// A new tool is one registry entry and one runner. The engine, the planner's
// prompt and the validation all pick it up without being changed.
func TestANewToolNeedsNoChangeToTheEngine(t *testing.T) {
	service, store := postService(&fakePosts{})
	service.deps.Registry.Register(Tool{
		Name: "shout", Description: "Make some text loud.", ReadOnly: true,
		Args:         []string{"text (required): text, up to 100 characters"},
		Outputs:      []Output{{"loud", KindText, "the loud text"}},
		ValidateArgs: objectArgs(map[string]argRule{"text": {required: true, maxRunes: 100}}, "text").validate,
	})
	if err := service.Handle("shout", Runner{Inline: func(_ context.Context, _ Workflow, step *Step) (map[string]any, error) {
		return map[string]any{"loud": strings.ToUpper(strArg(step.Args, "text"))}, nil
	}}); err != nil {
		t.Fatal(err)
	}
	var got string
	service.deps.Registry.Register(Tool{
		Name: "echo", Description: "Repeat text.", ReadOnly: true,
		Args:         []string{"text (required): text"},
		ValidateArgs: objectArgs(map[string]argRule{"text": {required: true, maxRunes: 100}}, "text").validate,
	})
	if err := service.Handle("echo", Runner{Inline: func(_ context.Context, _ Workflow, step *Step) (map[string]any, error) {
		got = strArg(step.Args, "text")
		return map[string]any{}, nil
	}}); err != nil {
		t.Fatal(err)
	}
	service.Seal()

	plan := Plan{Version: PlanVersion, Objective: "Shout", Steps: []PlanStep{
		{ID: "a", Tool: "shout", Args: map[string]any{"text": "hello"}, Needs: []string{}},
		{ID: "b", Tool: "echo", Args: map[string]any{"text": "I said ${a.loud}!"}, Needs: []string{"a"}},
	}}
	// Nothing here costs money or posts, so the plan starts without approval.
	wf, err := service.SubmitPlan(context.Background(), "user-1", plan, "key")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = store.Claim(context.Background(), 4, 0)
	service.HandleWorkflow(context.Background(), wf)
	runToEnd(service, store, wf.ID)
	done, _ := store.Get(context.Background(), "user-1", wf.ID)
	if done.Status != WorkflowCompleted || got != "I said HELLO!" {
		t.Fatalf("status %q got %q steps %+v", done.Status, got, done.Steps)
	}
	if catalog := service.deps.Registry.Catalog(); !strings.Contains(catalog, "- shout [read only]: Make some text loud.") || !strings.Contains(catalog, "gives loud (text)") {
		t.Fatalf("the planner is not told about the new tool:\n%s", catalog)
	}
}

func TestAToolWithNoRunnerIsTakenOutOfUse(t *testing.T) {
	service, _ := postService(nil) // no posting service connected
	service.Seal()
	if _, ok := service.deps.Registry.Get("schedule_post"); ok {
		t.Fatal("a tool that cannot run is still offered")
	}
	if strings.Contains(service.deps.Registry.Catalog(), "schedule_post") {
		t.Fatal("the planner is told about a tool that cannot run")
	}
	if err := ValidatePlan(clipThenPost(goodPost), service.deps.Registry); err == nil || !strings.Contains(err.Error(), "not available") {
		t.Fatalf("a plan naming it was not refused plainly: %v", err)
	}
	if err := service.Handle("no-such-tool", Runner{Inline: func(context.Context, Workflow, *Step) (map[string]any, error) { return nil, nil }}); err == nil {
		t.Fatal("a runner was accepted for a tool that does not exist")
	}
	if err := service.Handle("get_job_status", Runner{}); err == nil {
		t.Fatal("an empty runner was accepted")
	}
}

func TestTheCatalogListsEveryArgumentAndOutputInAFixedOrder(t *testing.T) {
	catalog := DefaultRegistry().Catalog()
	for _, want := range []string{
		"- generate_video [costs credits]",
		"arg scenes (required)",
		"gives result.video_url (url)",
		"- schedule_post [posts publicly, needs approval]",
		"arg platform (required): youtube, tiktok or instagram",
		"- discover_videos [costs credits]",
		"arg platform (required): one of tiktok, instagram",
	} {
		if !strings.Contains(catalog, want) {
			t.Errorf("catalog is missing %q", want)
		}
	}
	if catalog != DefaultRegistry().Catalog() || strings.Index(catalog, "- create_avatar_video") > strings.Index(catalog, "- discover_videos") {
		t.Fatal("the catalog is not in a fixed, sorted order")
	}
}

type scriptedPlanner struct {
	bodies  []string
	prompts []string
	systems []string
	calls   int
}

func (s *scriptedPlanner) GenerateJSON(_ context.Context, system, user string, _ *genai.Schema) ([]byte, gemini.Usage, error) {
	s.calls++
	s.systems = append(s.systems, system)
	s.prompts = append(s.prompts, user)
	body := s.bodies[min(s.calls-1, len(s.bodies)-1)]
	return []byte(body), gemini.Usage{TotalTokens: 10}, nil
}

func TestAPlanThatIsRejectedIsSentBackWithTheReason(t *testing.T) {
	bad := `{"version":1,"objective":"x","missing_info":[],"unsupported":[],"steps":[{"id":"s1","tool":"discover_videos","args":{"platform":"youtube"},"needs":[],"confirm":false}]}`
	client := &scriptedPlanner{bodies: []string{bad, goodPlanBody}}
	result, err := NewPlanner(client, DefaultRegistry()).Plan(context.Background(), "find skincare videos", ContextView{})
	if err != nil || !result.Ready || client.calls != 2 {
		t.Fatalf("result %+v err %v calls %d", result, err, client.calls)
	}
	if !strings.Contains(client.prompts[1], "Your previous plan was rejected") || !strings.Contains(client.prompts[1], "platform") {
		t.Fatalf("the model was not told why:\n%s", client.prompts[1])
	}
	if result.Usage.TotalTokens != 20 {
		t.Fatalf("both calls should be counted, got %d", result.Usage.TotalTokens)
	}
}

func TestThePlannerGivesUpAfterTheRepairsAreUsed(t *testing.T) {
	client := &scriptedPlanner{bodies: []string{`{"version":1,"objective":"x","missing_info":[],"unsupported":[],"steps":[{"id":"s1","tool":"http_fetch","args":{},"needs":[],"confirm":false}]}`}}
	if _, err := NewPlanner(client, DefaultRegistry()).Plan(context.Background(), "x", ContextView{}); err == nil || client.calls != 1+maxRepairs {
		t.Fatalf("err %v calls %d", err, client.calls)
	}
}

func TestAModelFailureIsNotRepairedAndThePromptListsOnlyToolsInUse(t *testing.T) {
	registry := DefaultRegistry()
	registry.Disable("schedule_post")
	client := &scriptedPlanner{bodies: []string{goodPlanBody}}
	if _, err := NewPlanner(client, registry).Plan(context.Background(), "find skincare videos", ContextView{}); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(client.systems[0], "schedule_post [") || !strings.Contains(client.systems[0], "- generate_video [costs credits]") {
		t.Fatalf("the prompt does not match the tools in use:\n%s", client.systems[0])
	}
	failing := &stubPlanClient{err: context.DeadlineExceeded}
	if _, err := NewPlanner(failing, registry).Plan(context.Background(), "x", ContextView{}); err == nil || failing.calls != 1 {
		t.Fatalf("a provider failure was retried: calls %d", failing.calls)
	}
}
