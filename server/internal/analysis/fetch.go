package analysis

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

// Stored keeps a fetched video in the person's own storage.
type Stored interface {
	StoreVideo(ctx context.Context, userID, jobID, name string, data []byte) (media.Descriptor, error)
}

// HandleFetch downloads a linked video into the person's storage so they can
// watch it, and add their own notes, before anything is sent to the model. The
// finished job carries the stored file's id, which the analysis then reads
// instead of downloading the video a second time.
func (p *Processor) HandleFetch(ctx context.Context, job jobs.Job) {
	if p.now().Sub(job.CreatedAt) > maxJobAge {
		p.fail(ctx, job, msgTimedOut)
		return
	}
	if !p.advance(ctx, job, jobs.Update{Status: jobs.StatusRunning, Stage: ptr(stageFetching), Progress: ptr(10)}) {
		return
	}
	link, ok := ParseLink(str(job.Input, "url"))
	if !ok {
		p.fail(ctx, job, msgUnusable)
		return
	}
	result := map[string]any{"kind": string(link.Kind), "url": link.URL}
	if link.Kind != KindYouTube {
		item, err := p.store(ctx, job, link)
		if err != nil {
			p.failed(ctx, job, err)
			return
		}
		result["media_id"] = item.ID
	}
	p.advance(ctx, job, jobs.Update{Status: jobs.StatusCompleted, Progress: ptr(100), Result: result})
}

func (p *Processor) store(ctx context.Context, job jobs.Job, link Link) (media.Descriptor, error) {
	if p.Stored == nil {
		return media.Descriptor{}, video.ErrNoVideoFile
	}
	file, err := p.load(ctx, link)
	if err != nil {
		return media.Descriptor{}, err
	}
	return p.Stored.StoreVideo(ctx, job.UserID, job.ID, "Linked video", file.Data)
}
