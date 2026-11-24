package videoedit

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type fakeKeeper struct {
	user, job, url, original string
	sound                    bool
}

func (k *fakeKeeper) AdoptWithSound(_ context.Context, userID, jobID, sourceURL, originalID, _ string, _ media.Mixer) (media.Descriptor, bool, error) {
	k.user, k.job, k.url, k.original = userID, jobID, sourceURL, originalID
	return media.Descriptor{ID: "kept"}, k.sound, nil
}

func editJob() jobs.Job {
	return jobs.Job{ID: "job-1", UserID: "u1", Type: JobType, Input: Request{
		VideoMediaID: "8b6f6c1e-3f5a-4a39-9d55-2a7d5a0e6a11", Prompt: "Put me in a navy suit", Seconds: 8,
	}.Args()}
}

func TestFinisherKeepsTheEditWithTheOwnersOriginalSound(t *testing.T) {
	k := &fakeKeeper{sound: true}
	f := Finisher{Files: k, Mix: func(context.Context, []byte, []byte) ([]byte, error) { return nil, nil }}
	if err := f.Finish(context.Background(), editJob(), []string{"https://cdn.kie/out.mp4"}); err != nil {
		t.Fatal(err)
	}
	if k.user != "u1" || k.job != "job-1" || k.url != "https://cdn.kie/out.mp4" || k.original != "8b6f6c1e-3f5a-4a39-9d55-2a7d5a0e6a11" {
		t.Fatalf("kept %+v", k)
	}
}

func TestFinisherReportsAnEditKeptSilent(t *testing.T) {
	f := Finisher{Files: &fakeKeeper{}, Mix: func(context.Context, []byte, []byte) ([]byte, error) { return nil, nil }}
	if err := f.Finish(context.Background(), editJob(), []string{"https://cdn.kie/out.mp4"}); err == nil {
		t.Fatal("a silent result should be reported")
	}
}

func TestFinisherDoesNothingWithoutFfmpeg(t *testing.T) {
	k := &fakeKeeper{}
	if err := (Finisher{Files: k}).Finish(context.Background(), editJob(), []string{"https://cdn.kie/out.mp4"}); err != nil || k.job != "" {
		t.Fatalf("err=%v kept=%+v", err, k)
	}
}
