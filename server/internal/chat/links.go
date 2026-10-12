package chat

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// Analyzer starts the background job that watches a linked video.
type Analyzer interface {
	Start(ctx context.Context, userID string, link analysis.Link, conversationID, key string) (jobs.Job, bool, error)
}

// WithAnalyzer turns on link handling: a supported video link in a message
// starts an analysis instead of going to the model.
func (s *Service) WithAnalyzer(a Analyzer) *Service {
	s.analyzer = a
	return s
}

const watchingReply = "I am watching that video now. It usually takes under a minute, and I will tell you what I find here."

// sendLink answers a message that carries a video link.
func (s *Service) sendLink(ctx context.Context, userID string, conv Conversation, user Message, link analysis.Link) (Exchange, error) {
	job, _, err := s.analyzer.Start(ctx, userID, link, conv.ID, "analysis:"+user.ID)
	if errors.Is(err, analysis.ErrTooManyBusy) {
		return Exchange{}, ErrBusy
	}
	if err != nil {
		return Exchange{}, err
	}
	assistant, err := s.store.AddAssistant(ctx, Message{
		ConversationID: conv.ID, UserID: userID, Role: RoleAssistant, Content: watchingReply, ReplyTo: user.ID, JobID: job.ID,
	})
	if err != nil {
		return Exchange{}, err
	}
	return s.finishTurn(ctx, userID, conv, user, assistant), nil
}

// JobFinished posts the outcome of a finished analysis into its conversation.
// It implements jobs.Observer and is safe to repeat: the follow-up exists once.
func (s *Service) JobFinished(ctx context.Context, job jobs.Job) {
	if job.Type != analysis.JobType {
		return
	}
	conversationID, _ := job.Input["conversation_id"].(string)
	if conversationID == "" {
		return
	}
	if _, err := s.store.Get(ctx, job.UserID, conversationID); err != nil {
		return // archived or gone: nobody is waiting for it
	}
	content := analysisFailed
	if job.Status == jobs.StatusCompleted {
		result, ok := analysis.FromMap(asMap(job.Result["analysis"]))
		if ok {
			content = result.Describe()
		}
	} else if job.Error != "" {
		content = job.Error + " Your credits were returned."
	}
	msg, isNew, err := s.store.AddAssistantOnce(ctx, Message{
		ConversationID: conversationID, UserID: job.UserID, Role: RoleAssistant, Content: content, JobID: job.ID,
	}, "job:"+job.ID)
	if err != nil {
		slog.Error("post analysis result", "job_id", job.ID, "error", err)
		return
	}
	if isNew {
		s.publish(job.UserID, msg)
	}
}

const analysisFailed = "I could not read that video. Your credits were returned."

func asMap(v any) map[string]any {
	m, _ := v.(map[string]any)
	return m
}

const reconcileBatch = 50

// Reconcile posts results that finished while nobody was listening, for example
// when the process stopped between a job ending and its message being saved.
func (s *Service) Reconcile(ctx context.Context) int {
	missing, err := s.store.MissingFollowUps(ctx, 30*time.Second, reconcileBatch)
	if err != nil {
		slog.Error("find missing follow-ups", "error", err)
		return 0
	}
	for _, job := range missing {
		s.JobFinished(ctx, job)
	}
	return len(missing)
}

// RunReconciler checks on an interval until ctx ends.
func (s *Service) RunReconciler(ctx context.Context, every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		s.Reconcile(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
