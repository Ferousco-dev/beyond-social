package generate

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs/jobstest"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
)

const picture = "10000000-0000-4000-8000-000000000001"

func twoScenes() Request {
	return Request{
		Scenes:      []Scene{{Prompt: "A runner laces her shoes", Seconds: 5}, {Prompt: "She sprints", Seconds: 6}},
		AspectRatio: "9:16", Sound: true,
	}
}

func TestValidateEnforcesTheModelsLimits(t *testing.T) {
	if err := twoScenes().Validate(); err != nil {
		t.Fatal(err)
	}
	long := twoScenes()
	long.Scenes[0].Seconds = 12
	long.Scenes[1].Seconds = 12
	tooMany := Request{}
	for range MaxScenes + 1 {
		tooMany.Scenes = append(tooMany.Scenes, Scene{Prompt: "x", Seconds: 2})
	}
	for name, r := range map[string]Request{
		"no scenes":        {},
		"too long a clip":  long,
		"too short a clip": {Scenes: []Scene{{Prompt: "x", Seconds: 2}}},
		"too many scenes":  tooMany,
		"empty prompt":     {Scenes: []Scene{{Prompt: "  ", Seconds: 5}}},
		"shot over 12s":    {Scenes: []Scene{{Prompt: "a", Seconds: 13}, {Prompt: "b", Seconds: 2}}},
		"bad ratio":        {Scenes: twoScenes().Scenes, AspectRatio: "4:3"},
		"bad picture id":   {Scenes: twoScenes().Scenes, ImageMediaID: "../../etc/passwd"},
	} {
		if err := r.Validate(); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
	single := Request{Scenes: []Scene{{Prompt: "x", Seconds: 15}}}
	if err := single.Validate(); err != nil {
		t.Errorf("a single 15 second shot is allowed: %v", err)
	}
}

func TestArgsRoundTripAndRefuseExtras(t *testing.T) {
	r := twoScenes()
	r.ImageMediaID = picture
	got, err := ParseArgs(r.Args())
	if err != nil || got.TotalSeconds() != 11 || got.ImageMediaID != picture || !got.Sound {
		t.Fatalf("got = %+v err=%v", got, err)
	}
	args := r.Args()
	args["model"] = "something-else"
	if _, err := ParseArgs(args); err == nil {
		t.Fatal("an unknown argument was accepted")
	}
}

type fakePictures struct {
	data []byte
	err  error
	user string
}

func (f *fakePictures) Load(_ context.Context, user, _ string, _ int64) ([]byte, string, error) {
	f.user = user
	return f.data, "image/png", f.err
}

type fakeUploader struct{ got string }

func (f *fakeUploader) Upload(_ context.Context, name, _ string, _ []byte) (string, error) {
	f.got = name
	return "https://kie.example/" + name, nil
}

func job(t *testing.T, r Request) jobs.Job {
	t.Helper()
	j, _, err := jobs.NewService(jobstest.New(), nil).Create(context.Background(), "u1", JobType, r.Args(), "")
	if err != nil {
		t.Fatal(err)
	}
	return j
}

func TestASingleSceneIsASingleShotWithAnExplicitRatio(t *testing.T) {
	r := Request{Scenes: []Scene{{Prompt: "A runner", Seconds: 8}}}
	p, err := Builder{}.Build(context.Background(), job(t, r))
	if err != nil || p.Model != Model {
		t.Fatalf("prepared = %+v err=%v", p, err)
	}
	in := p.Input
	if in["multi_shots"] != false || in["prompt"] != "A runner" || in["duration"] != "8" || in["aspect_ratio"] != "9:16" || in["mode"] != "std" || in["sound"] != false {
		t.Fatalf("input = %+v", in)
	}
	if _, has := in["image_urls"]; has {
		t.Fatal("no picture was attached")
	}
}

func TestSeveralScenesBecomeAMultiShotWhoseDurationIsTheirSum(t *testing.T) {
	p, err := Builder{}.Build(context.Background(), job(t, twoScenes()))
	if err != nil {
		t.Fatal(err)
	}
	shots, _ := p.Input["multi_prompt"].([]map[string]any)
	if p.Input["multi_shots"] != true || p.Input["duration"] != "11" || len(shots) != 2 || shots[1]["duration"] != 6 || p.Input["sound"] != true {
		t.Fatalf("input = %+v", p.Input)
	}
	if _, has := p.Input["prompt"]; has {
		t.Fatal("a multi-shot request carries no single prompt")
	}
}

func TestAPictureIsUploadedForTheOwnerAndReplacesTheAspectRatio(t *testing.T) {
	pics, up := &fakePictures{data: []byte("png")}, &fakeUploader{}
	r := Request{Scenes: []Scene{{Prompt: "x", Seconds: 5}}, ImageMediaID: picture, AspectRatio: "16:9"}
	p, err := Builder{Pictures: pics, Uploader: up}.Build(context.Background(), job(t, r))
	if err != nil || pics.user != "u1" || up.got != picture+".png" {
		t.Fatalf("err=%v user=%q upload=%q", err, pics.user, up.got)
	}
	urls, _ := p.Input["image_urls"].([]string)
	if len(urls) != 1 || urls[0] != "https://kie.example/"+picture+".png" {
		t.Fatalf("image_urls = %v", urls)
	}
	if _, has := p.Input["aspect_ratio"]; has {
		t.Fatal("the clip follows the picture, so no ratio is sent")
	}
}

func TestProblemsThatRetryingCannotFixCarryAMessageForTheUser(t *testing.T) {
	r := Request{Scenes: []Scene{{Prompt: "x", Seconds: 5}}, ImageMediaID: picture}
	_, err := Builder{Pictures: &fakePictures{err: media.ErrNotFound}, Uploader: &fakeUploader{}}.Build(context.Background(), job(t, r))
	var userErr *transform.UserError
	if !errors.As(err, &userErr) || userErr.Message == "" {
		t.Fatalf("err = %v", err)
	}
	bad := job(t, twoScenes())
	bad.Input["scenes"] = []any{}
	if _, err := (Builder{}).Build(context.Background(), bad); !errors.As(err, &userErr) {
		t.Fatalf("an invalid stored request: %v", err)
	}
}

func TestSubmitValidatesAndCapsClipsInProgress(t *testing.T) {
	svc := NewService(jobs.NewService(jobstest.New(), nil))
	if _, _, err := svc.Submit(context.Background(), "u1", Request{}, "k"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("an empty request: %v", err)
	}
	for i := range maxActivePerUser {
		if _, _, err := svc.Submit(context.Background(), "u1", twoScenes(), string(rune('a'+i))); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := svc.Submit(context.Background(), "u1", twoScenes(), "z"); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("err = %v", err)
	}
}
