package credits

import (
	"context"
	"fmt"
	"math"

	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

// Job types priced here. They mirror the constants in the transform and
// analysis packages, which this package must not import.
const (
	jobTransform = "video_transform"
	jobAnalysis  = "video_analysis"
	jobGenerate  = "video_generate"
)

// JobBiller charges for jobs. It implements jobs.Biller.
type JobBiller struct {
	svc *Service
}

func NewJobBiller(svc *Service) *JobBiller { return &JobBiller{svc: svc} }

// Reserve prices the job from its input and takes the credits. Job types with
// no price are free.
func (b *JobBiller) Reserve(ctx context.Context, job jobs.Job) error {
	amount, reason, err := b.estimate(ctx, job)
	if err != nil {
		return err
	}
	return b.svc.Reserve(ctx, job.UserID, job.ID, amount, reason)
}

// Finish settles a job that delivered and refunds one that did not.
func (b *JobBiller) Finish(ctx context.Context, job jobs.Job) error {
	if job.Status == jobs.StatusFailed {
		return b.svc.Refund(ctx, job.UserID, job.ID, "job failed")
	}
	// Every job is priced before it starts and costs exactly what was reserved, so the charge is
	// kept as it is. Settling through Service.Settle would apply a free user's price multiplier
	// a second time to an amount that already includes it, handing credits back when it is below 100%.
	return b.svc.Keep(ctx, job.UserID, job.ID)
}

func (b *JobBiller) estimate(ctx context.Context, job jobs.Job) (int, string, error) {
	switch job.Type {
	case jobTransform:
		action := fmt.Sprintf("%s:%v:%v", jobTransform, job.Input["duration"], job.Input["resolution"])
		credits, err := b.svc.Quote(ctx, action)
		return credits, action, err
	case jobGenerate:
		req, err := generate.ParseArgs(job.Input)
		if err != nil {
			return 0, "", err
		}
		action := VideoAction(req.Sound)
		rate, err := b.svc.Quote(ctx, action)
		return rate * req.TotalSeconds(), action, err
	case kietools.JobTalk:
		req, err := kietools.ParseTalk(job.Input)
		if err != nil {
			return 0, "", err
		}
		rate, err := b.svc.Quote(ctx, ActionTalkingSecond)
		return rate * req.Seconds, ActionTalkingSecond, err
	case kietools.JobSpeech:
		req, err := kietools.ParseSpeech(job.Input)
		if err != nil {
			return 0, "", err
		}
		rate, err := b.svc.Quote(ctx, "speech_thousand_chars")
		return rate * ((len([]rune(req.Text)) + 999) / 1000), "speech_thousand_chars", err
	case jobAnalysis:
		credits, err := b.svc.Quote(ctx, jobAnalysis)
		return credits, jobAnalysis, err
	case kietools.JobLiveAvatar:
		// A lip-synced video lasts as long as its voice recording, which was
		// measured when the job was submitted.
		seconds, ok := job.Input["seconds"].(float64)
		if !ok || seconds < 1 {
			seconds = kietools.MaxRecordingSeconds
		}
		rate, err := b.svc.Quote(ctx, ActionTalkingSecond)
		return rate * int(math.Ceil(seconds)), ActionTalkingSecond, err
	}
	return 0, "", nil
}
