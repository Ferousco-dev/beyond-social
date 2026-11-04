package chat

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
)

func scriptOf(seconds ...float64) Script {
	s := Script{Title: "Dawn run", Style: "cinematic"}
	for _, sec := range seconds {
		s.Scenes = append(s.Scenes, Scene{Seconds: sec, Visual: "A runner"})
	}
	return s
}

func lengths(clips []generate.Request) []int {
	out := make([]int, len(clips))
	for i, c := range clips {
		out[i] = c.TotalSeconds()
	}
	return out
}

func TestAShortScriptIsOneClip(t *testing.T) {
	clips, err := scriptOf(5, 6).Clips()
	if err != nil || len(clips) != 1 || clips[0].TotalSeconds() != 11 || len(clips[0].Scenes) != 2 {
		t.Fatalf("clips = %v err=%v", lengths(clips), err)
	}
}

func TestALongScriptIsCutBetweenScenesNeverInsideOne(t *testing.T) {
	clips, err := scriptOf(8, 8, 8, 8).Clips()
	if err != nil || len(clips) != 4 {
		t.Fatalf("clips = %v err=%v", lengths(clips), err)
	}
	clips, err = scriptOf(6, 6, 6, 6, 6).Clips()
	if err != nil || len(clips) != 3 || lengths(clips)[0] != 12 {
		t.Fatalf("clips = %v err=%v", lengths(clips), err)
	}
	for _, c := range clips {
		if c.TotalSeconds() > generate.MaxClipSeconds || c.TotalSeconds() < generate.MinClipSeconds {
			t.Fatalf("clip of %d seconds", c.TotalSeconds())
		}
	}
}

func TestATooShortClipIsStretchedToTheMinimum(t *testing.T) {
	clips, err := scriptOf(1).Clips()
	if err != nil || len(clips) != 1 || clips[0].TotalSeconds() != generate.MinClipSeconds {
		t.Fatalf("clips = %v err=%v", lengths(clips), err)
	}
}

func TestSoundIsOnOnlyForClipsWhereSomeoneSpeaks(t *testing.T) {
	s := Script{Title: "t", Scenes: []Scene{
		{Seconds: 10, Visual: "a", Voiceover: "hello"},
		{Seconds: 10, Visual: "b"},
	}}
	clips, err := s.Clips()
	if err != nil || len(clips) != 2 || !clips[0].Sound || clips[1].Sound {
		t.Fatalf("clips = %+v err=%v", clips, err)
	}
	if !strings.Contains(clips[0].Scenes[0].Prompt, `A voice says: "hello"`) {
		t.Fatalf("prompt = %q", clips[0].Scenes[0].Prompt)
	}
}

func TestThePictureStartsOnlyTheFirstClipAndDropsTheAspectRatio(t *testing.T) {
	s := scriptOf(10, 10)
	s.ImageMediaID = "10000000-0000-4000-8000-000000000001"
	clips, err := s.Clips()
	if err != nil || len(clips) != 2 || clips[0].ImageMediaID == "" || clips[0].AspectRatio != "" || clips[1].ImageMediaID != "" || clips[1].AspectRatio == "" {
		t.Fatalf("clips = %+v err=%v", clips, err)
	}
}

func TestAScriptNeedingMoreThanTheMaximumClipsIsRefused(t *testing.T) {
	long := make([]float64, 0, 12)
	for range 12 {
		long = append(long, 12)
	}
	if _, err := scriptOf(long...).Clips(); !errors.Is(err, ErrScriptTooLong) {
		t.Fatalf("err = %v", err)
	}
}

func TestThePlanRunsClipsInOrderAndPassesValidation(t *testing.T) {
	plan, _, err := scriptOf(8, 8, 8).Plan(nil)
	if err != nil || len(plan.Steps) != 3 || len(plan.Steps[0].Needs) != 0 || plan.Steps[2].Needs[0] != "clip-2" {
		t.Fatalf("plan = %+v err=%v", plan, err)
	}
	if err := orchestrator.ValidatePlan(plan, orchestrator.DefaultRegistry()); err != nil {
		t.Fatalf("the plan fails validation: %v", err)
	}
	if !strings.Contains(plan.Objective, "3 clips") {
		t.Fatalf("objective = %q", plan.Objective)
	}
}

type recordingScripts struct {
	got   *Script
	calls int
}

func (r *recordingScripts) PlanScript(_ context.Context, _ string, s Script, _ *PostIntent, _ string) (Outcome, error) {
	r.calls++
	r.got = &s
	return Outcome{WorkflowID: "w9", Reply: "plan from script"}, nil
}

func TestUseThisScriptBuildsThePlanFromTheScriptItself(t *testing.T) {
	store := newMem()
	script, _ := DecodeScript([]byte(goodScript))
	store.msgs = append(store.msgs, Message{ID: "m0", ConversationID: "c1", UserID: "u1", Role: RoleAssistant, Content: "script", Script: &script})
	planner, scripts := &stubPlanner{}, &recordingScripts{}
	svc := NewService(store, &stubRouter{decision: Decision{Create: true}}, planner).WithScriptPlanner(scripts)
	ex, err := svc.Send(context.Background(), "u1", "c1", "Use this script.", "", nil, "")
	if err != nil || scripts.calls != 1 || planner.calls != 0 || scripts.got.Title != "Dawn run" || ex.Assistant.WorkflowID != "w9" {
		t.Fatalf("scripts=%d planner=%d ex=%+v err=%v", scripts.calls, planner.calls, ex, err)
	}
}

func TestAnOlderScriptIsNotUsedOnceTheAssistantSaidSomethingElse(t *testing.T) {
	store := newMem()
	script, _ := DecodeScript([]byte(goodScript))
	store.msgs = append(store.msgs,
		Message{ID: "m0", Role: RoleAssistant, Content: "script", Script: &script},
		Message{ID: "m1", Role: RoleUser, Content: "what is a hook?"},
		Message{ID: "m2", Role: RoleAssistant, Content: "A hook is..."},
	)
	planner, scripts := &stubPlanner{}, &recordingScripts{}
	svc := NewService(store, &stubRouter{decision: Decision{Create: true}}, planner).WithScriptPlanner(scripts)
	if _, err := svc.Send(context.Background(), "u1", "c1", "make a video of a cat", "", nil, ""); err != nil {
		t.Fatal(err)
	}
	if scripts.calls != 0 || planner.calls != 1 {
		t.Fatalf("scripts=%d planner=%d", scripts.calls, planner.calls)
	}
}

func TestTheAttachedPictureTravelsWithTheScriptAndRevisionsKeepIt(t *testing.T) {
	store := newMem()
	svc := NewService(store, &stubRouter{decision: Decision{Script: true}}, &stubPlanner{}).
		WithScriptWriter(&stubWriter{}).WithAttachments(files())
	ex, err := svc.Send(context.Background(), "u1", "c1", "an ad from this", "", []string{"img"}, "")
	if err != nil || ex.Assistant.Script == nil || ex.Assistant.Script.ImageMediaID != "img" {
		t.Fatalf("script = %+v err=%v", ex.Assistant.Script, err)
	}
	if !strings.Contains(ex.Assistant.Content, "start from the picture") {
		t.Fatalf("content = %q", ex.Assistant.Content)
	}
	revised, err := svc.Send(context.Background(), "u1", "c1", "make scene 2 shorter", "", nil, "")
	if err != nil || revised.Assistant.Script == nil || revised.Assistant.Script.ImageMediaID != "img" {
		t.Fatalf("revision = %+v err=%v", revised.Assistant.Script, err)
	}
}

func TestAModelCannotChooseThePicture(t *testing.T) {
	data := strings.Replace(goodScript, `"title"`, `"image_media_id":"someone-elses-file","title"`, 1)
	got, err := DecodeScript([]byte(data))
	if err != nil || got.ImageMediaID != "" {
		t.Fatalf("picture = %q err=%v: only the service may set it", got.ImageMediaID, err)
	}
}
