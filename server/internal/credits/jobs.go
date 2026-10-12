package credits

import (
	"context"
	"fmt"
	"math"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// Job types priced here. They mirror the constants in the transform and
// avatarvideo packages, which this package must not import.
const (
	jobTransform   = "video_transform"
	jobAvatarVideo = "avatar_video"
	jobAnalysis    = "video_analysis"

	ActionAvatarVideoSecond = "avatar_video_second"

	// Speech runs at roughly this many characters per second, used to estimate
	// the length of an avatar video before it exists.
	charsPerSecond = 15
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
	actual, err := b.actual(ctx, job)
	if err != nil {
		return err
	}
	return b.svc.Settle(ctx, job.UserID, job.ID, actual)
}

func (b *JobBiller) estimate(ctx context.Context, job jobs.Job) (int, string, error) {
	switch job.Type {
	case jobTransform:
		action := fmt.Sprintf("%s:%v:%v", jobTransform, job.Input["duration"], job.Input["resolution"])
		credits, err := b.svc.Quote(ctx, action)
		return credits, action, err
	case jobAnalysis:
		credits, err := b.svc.Quote(ctx, jobAnalysis)
		return credits, jobAnalysis, err
	case jobAvatarVideo:
		rate, err := b.svc.Quote(ctx, ActionAvatarVideoSecond)
		if err != nil {
			return 0, "", err
		}
		script, _ := job.Input["script"].(string)
		seconds := max((len([]rune(script))+charsPerSecond-1)/charsPerSecond, 1)
		return rate * seconds, ActionAvatarVideoSecond, nil
	}
	return 0, "", nil
}

// actual is what a finished job should cost. Avatar videos are charged for the
// length HeyGen reports, never more than was reserved; everything else keeps
// its reservation.
func (b *JobBiller) actual(ctx context.Context, job jobs.Job) (int, error) {
	reserved, err := b.svc.store.Reserved(ctx, job.ID)
	if err != nil {
		return 0, err
	}
	if job.Type != jobAvatarVideo {
		return reserved, nil
	}
	seconds, ok := job.Result["duration_seconds"].(float64)
	if !ok || seconds <= 0 {
		return reserved, nil
	}
	rate, err := b.svc.Quote(ctx, ActionAvatarVideoSecond)
	if err != nil {
		return reserved, nil
	}
	return min(int(math.Ceil(seconds))*rate, reserved), nil
}
