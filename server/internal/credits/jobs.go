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

// quantity says what a job is priced by: the price-table action and how many of
// its unit the job uses. Charging and spend recording both read it, so the two
// can never disagree about what a job was. Unpriced job types return no action.
func (b *JobBiller) quantity(job jobs.Job) (action string, units int, err error) {
	switch job.Type {
	case jobTransform:
		return fmt.Sprintf("%s:%v:%v", jobTransform, job.Input["duration"], job.Input["resolution"]), 1, nil
	case jobGenerate:
		req, err := generate.ParseArgs(job.Input)
		if err != nil {
			return "", 0, err
		}
		return VideoAction(req.Sound), req.TotalSeconds(), nil
	case kietools.JobTalk:
		req, err := kietools.ParseTalk(job.Input)
		if err != nil {
			return "", 0, err
		}
		return ActionTalkingSecond, req.Seconds, nil
	case kietools.JobSpeech:
		req, err := kietools.ParseSpeech(job.Input)
		if err != nil {
			return "", 0, err
		}
		return "speech_thousand_chars", (len([]rune(req.Text)) + 999) / 1000, nil
	case jobAnalysis:
		return jobAnalysis, 1, nil
	case kietools.JobLiveAvatar:
		// A lip-synced video lasts as long as its voice recording, which was
		// measured when the job was submitted.
		seconds, ok := job.Input["seconds"].(float64)
		if !ok || seconds < 1 {
			seconds = kietools.MaxRecordingSeconds
		}
		return ActionTalkingSecond, int(math.Ceil(seconds)), nil
	}
	return "", 0, nil
}

func (b *JobBiller) estimate(ctx context.Context, job jobs.Job) (int, string, error) {
	action, units, err := b.quantity(job)
	if err != nil || action == "" {
		return 0, "", err
	}
	rate, err := b.svc.Quote(ctx, action)
	return rate * units, action, err
}
