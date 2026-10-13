package orchestrator

import (
	"context"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

type fakeMedia struct {
	types []string
	args  []map[string]any
}

func (f *fakeMedia) Submit(_ context.Context, _, jobType string, args map[string]any, _ string) (jobs.Job, bool, error) {
	f.types = append(f.types, jobType)
	f.args = append(f.args, args)
	return jobs.Job{ID: "job-" + jobType, Status: jobs.StatusQueued}, true, nil
}

type fakeScripts struct{}

func (fakeScripts) Check(context.Context, string) (kietools.Review, error) {
	return kietools.Review{Verdict: kietools.VerdictFix, Issues: "Too long.", Script: "Short and clear."}, nil
}

func mediaService(media MediaSubmitter, scripts ScriptChecker) (*Service, *fakeStore) {
	store := newFakeStore()
	registry := DefaultRegistry()
	service, err := NewService(Deps{
		Store: store, Planner: NewPlanner(&stubPlanClient{}, registry), Registry: registry,
		Discovery: &fakeDiscovery{status: discovery.StatusCompleted},
		Transform: &fakeTransform{}, AvatarVid: &fakeAvatarVideo{},
		Media: media, Scripts: scripts,
		Jobs: &fakeJobs{status: jobs.StatusCompleted, result: map[string]any{
			"audio_url": "https://cdn.example/voice.mp3", "image_url": "https://cdn.example/p.png", "video_url": "https://cdn.example/v.mp4",
		}},
		Credits: AllowAll{},
	})
	if err != nil {
		panic(err)
	}
	return service, store
}

func voiceoverPlan() Plan {
	return Plan{Version: PlanVersion, Objective: "A talking photo", Steps: []PlanStep{
		{ID: "check", Tool: "check_script", Args: map[string]any{"script": "A long rambling script"}, Needs: []string{}},
		{ID: "say", Tool: "speak_text", Args: map[string]any{"text": "${check.script}"}, Needs: []string{"check"}},
		{ID: "talk", Tool: "talking_photo", Needs: []string{"say"}, Args: map[string]any{
			"image_media_id": "10000000-0000-4000-8000-000000000001", "audio_url": "${say.result.audio_url}",
			"prompt": "warm smile, steady camera", "seconds": float64(6),
		}},
	}}
}

func TestAReviewedScriptIsSpokenAndGivenToATalkingPhoto(t *testing.T) {
	media := &fakeMedia{}
	service, store := mediaService(media, fakeScripts{})
	wf, err := service.SubmitPlan(context.Background(), "user-1", voiceoverPlan(), "key")
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
		t.Fatalf("status = %q steps = %+v", done.Status, done.Steps)
	}
	if len(media.types) != 2 || media.types[0] != kietools.JobSpeech || media.types[1] != kietools.JobTalk {
		t.Fatalf("jobs = %v", media.types)
	}
	if media.args[0]["text"] != "Short and clear." || media.args[1]["audio_url"] != "https://cdn.example/voice.mp3" {
		t.Fatalf("args = %+v", media.args)
	}
}

func TestMediaToolsAreOffWithoutTheirProviders(t *testing.T) {
	service, _ := mediaService(nil, nil)
	service.Seal()
	for _, name := range []string{"edit_image", "talking_photo", "speak_text", "check_script"} {
		if _, ok := service.deps.Registry.Get(name); ok {
			t.Errorf("%s should be disabled", name)
		}
	}
}

func TestAPlanCannotPassTheWrongKindOfOutput(t *testing.T) {
	plan := voiceoverPlan()
	plan.Steps[2].Args["audio_url"] = "${check.verdict}"
	if err := ValidatePlan(plan, DefaultRegistry()); err == nil {
		t.Fatal("a step without an output path for audio was accepted")
	}
}
