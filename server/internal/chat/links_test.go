package chat

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

type stubAnalyzer struct {
	starts int
	link   analysis.Link
	key    string
	err    error
}

func (a *stubAnalyzer) Start(_ context.Context, _ string, link analysis.Link, conversationID, key string) (jobs.Job, bool, error) {
	a.starts++
	a.link, a.key = link, key
	return jobs.Job{ID: "job-1", Input: map[string]any{"conversation_id": conversationID}}, true, a.err
}

func TestALinkStartsAnAnalysisInsteadOfAskingTheModel(t *testing.T) {
	store, router, an := newMem(), &stubRouter{decision: Decision{Reply: "should not be used"}}, &stubAnalyzer{}
	svc := service(router, &stubPlanner{}, store).WithAnalyzer(an)
	ex, err := svc.Send(context.Background(), "u1", "c1", "make one like https://youtu.be/dQw4w9WgXcQ for my shop", "k")
	if err != nil {
		t.Fatal(err)
	}
	if router.calls != 0 || an.starts != 1 || ex.Assistant.JobID != "job-1" || ex.Assistant.Content != watchingReply {
		t.Fatalf("calls=%d starts=%d reply=%+v", router.calls, an.starts, ex.Assistant)
	}
	if an.link.Kind != analysis.KindYouTube || an.key != "analysis:"+ex.User.ID {
		t.Fatalf("link=%+v key=%q", an.link, an.key)
	}
}

func TestLinkErrorsReachTheCaller(t *testing.T) {
	for name, tc := range map[string]struct {
		err  error
		want error
	}{
		"busy":        {analysis.ErrTooManyBusy, ErrBusy},
		"no credits":  {credits.ErrInsufficient, credits.ErrInsufficient},
		"daily limit": {credits.ErrDailyLimit, credits.ErrDailyLimit},
	} {
		t.Run(name, func(t *testing.T) {
			svc := service(&stubRouter{}, &stubPlanner{}, newMem()).WithAnalyzer(&stubAnalyzer{err: tc.err})
			if _, err := svc.Send(context.Background(), "u1", "c1", "https://youtu.be/dQw4w9WgXcQ", ""); !errors.Is(err, tc.want) {
				t.Fatalf("err = %v, want %v", err, tc.want)
			}
		})
	}
}

func TestWithoutAnAnalyzerALinkIsJustText(t *testing.T) {
	router := &stubRouter{decision: Decision{Reply: "ok"}}
	if _, err := service(router, &stubPlanner{}, newMem()).Send(context.Background(), "u1", "c1", "https://youtu.be/dQw4w9WgXcQ", ""); err != nil || router.calls != 1 {
		t.Fatalf("calls=%d err=%v", router.calls, err)
	}
}

func finished(status jobs.Status, errText string) jobs.Job {
	result := map[string]any{}
	if status == jobs.StatusCompleted {
		result["analysis"] = map[string]any{
			"summary": "A runner at dawn.", "hook": "Splash", "scenes": []any{}, "duration_seconds": 10.0,
		}
	}
	return jobs.Job{ID: "job-1", UserID: "u1", Type: analysis.JobType, Status: status, Error: errText,
		Input: map[string]any{"conversation_id": "c1"}, Result: result}
}

func TestFinishedAnalysisIsPostedOnceIntoItsConversation(t *testing.T) {
	store := newMem()
	svc := service(&stubRouter{}, &stubPlanner{}, store)
	for range 3 {
		svc.JobFinished(context.Background(), finished(jobs.StatusCompleted, ""))
	}
	if len(store.msgs) != 1 || !strings.Contains(store.msgs[0].Content, "A runner at dawn.") || store.msgs[0].JobID != "job-1" {
		t.Fatalf("messages = %+v", store.msgs)
	}
}

func TestAFailedAnalysisTellsTheUserAndSaysCreditsCameBack(t *testing.T) {
	store := newMem()
	service(&stubRouter{}, &stubPlanner{}, store).JobFinished(context.Background(), finished(jobs.StatusFailed, "I could not open that video."))
	if len(store.msgs) != 1 || !strings.Contains(store.msgs[0].Content, "could not open") || !strings.Contains(store.msgs[0].Content, "credits were returned") {
		t.Fatalf("messages = %+v", store.msgs)
	}
}

func TestOtherJobsAndOtherPeoplesConversationsAreIgnored(t *testing.T) {
	store := newMem()
	svc := service(&stubRouter{}, &stubPlanner{}, store)
	other := finished(jobs.StatusCompleted, "")
	other.Type = "video_transform"
	svc.JobFinished(context.Background(), other)
	stranger := finished(jobs.StatusCompleted, "")
	stranger.UserID = "someone-else"
	svc.JobFinished(context.Background(), stranger)
	if len(store.msgs) != 0 {
		t.Fatalf("messages = %+v", store.msgs)
	}
}

func TestReconcilePostsResultsThatWereMissed(t *testing.T) {
	store := newMem()
	store.missing = []jobs.Job{finished(jobs.StatusCompleted, ""), finished(jobs.StatusFailed, "I could not open that video.")}
	store.missing[1].ID = "job-2"
	svc := service(&stubRouter{}, &stubPlanner{}, store)
	if n := svc.Reconcile(context.Background()); n != 2 {
		t.Fatalf("reconciled %d", n)
	}
	if len(store.msgs) != 2 {
		t.Fatalf("messages = %+v", store.msgs)
	}
	svc.Reconcile(context.Background()) // the same jobs again: posted once each
	if len(store.msgs) != 2 {
		t.Fatalf("a second pass added messages: %+v", store.msgs)
	}
}
