package chat

import (
	"context"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// Exchange is a user message and the assistant's answer to it.
type Exchange struct {
	User      Message `json:"user"`
	Assistant Message `json:"assistant"`
}

// Send saves the user's message and answers it. Sending again with the same key
// returns the earlier answer instead of asking the model a second time.
func (s *Service) Send(ctx context.Context, userID, conversationID, content, key string, attachmentIDs []string) (Exchange, error) {
	items, err := s.resolveAttachments(ctx, userID, attachmentIDs)
	if err != nil {
		return Exchange{}, err
	}
	text, err := cleanMessage(content, len(items) > 0)
	if err != nil {
		return Exchange{}, err
	}
	if text == "" {
		text = attachedSummary(items)
	}
	conv, err := s.store.Get(ctx, userID, conversationID)
	if err != nil {
		return Exchange{}, err
	}

	if err := s.checkLimit(ctx, userID); err != nil {
		return Exchange{}, err
	}
	user, isNew, err := s.store.AddUser(ctx, Message{ConversationID: conv.ID, UserID: userID, Role: RoleUser, Content: text, Attachments: descriptors(items)}, key)
	if err != nil {
		return Exchange{}, err
	}
	if !isNew {
		if reply, ok, err := s.store.ReplyTo(ctx, user.ID); err != nil || ok {
			return Exchange{User: user, Assistant: reply}, err
		}
	}

	if s.analyzer != nil {
		if link, _, ok := analysis.FindLink(text); ok {
			return s.sendLink(ctx, userID, conv, user, link)
		}
	}

	if s.analyzer != nil {
		if v, ok := firstOfKind(items, media.KindVideo); ok {
			return s.sendVideo(ctx, userID, conv, user, v)
		}
	}

	history, err := s.history(ctx, userID, conv.ID, user.ID)
	if err != nil {
		return Exchange{}, err
	}
	files, err := s.readableFiles(ctx, userID, items)
	if err != nil {
		return Exchange{}, err
	}
	reply, workflowID, err := s.answer(ctx, userID, text, history, user.ID, files)
	if err != nil {
		return Exchange{}, err
	}

	assistant, err := s.store.AddAssistant(ctx, Message{
		ConversationID: conv.ID, UserID: userID, Role: RoleAssistant, Content: reply, WorkflowID: workflowID, ReplyTo: user.ID,
	})
	if err != nil {
		return Exchange{}, err
	}
	return s.finishTurn(ctx, userID, conv, user, assistant), nil
}

// finishTurn titles a new thread and tells the user's open screens.
func (s *Service) finishTurn(ctx context.Context, userID string, conv Conversation, user, assistant Message) Exchange {
	if conv.Title == "" {
		_ = s.store.SetTitle(ctx, conv.ID, title(user.Content)) // cosmetic: never fail a turn over it
	}
	s.publish(userID, user)
	s.publish(userID, assistant)
	return Exchange{User: user, Assistant: assistant}
}

func (s *Service) answer(ctx context.Context, userID, text string, history []Turn, userMessageID string, files []gemini.Media) (reply, workflowID string, err error) {
	decision, err := s.router.Route(ctx, history, text, files)
	if err != nil {
		alerts.Report(ctx, s.alerts, err, alerts.Context{Source: "chat", UserID: userID})
		return "", "", err
	}
	if !decision.Create {
		return decision.Reply, "", nil
	}
	outcome, err := s.planner.Plan(ctx, userID, text, history, "chat:"+userMessageID)
	if err != nil {
		return "", "", err
	}
	return outcome.Reply, outcome.WorkflowID, nil
}

// history is the recent thread before the message being answered.
func (s *Service) history(ctx context.Context, userID, conversationID, exceptID string) ([]Turn, error) {
	msgs, err := s.store.Messages(ctx, userID, conversationID, historyTurns+1)
	if err != nil {
		return nil, err
	}
	turns := make([]Turn, 0, len(msgs))
	for _, m := range msgs {
		if m.ID != exceptID {
			turns = append(turns, Turn{Role: m.Role, Content: m.Content + attachmentNote(m.Attachments)})
		}
	}
	if len(turns) > historyTurns {
		turns = turns[len(turns)-historyTurns:]
	}
	return turns, nil
}

func (s *Service) checkLimit(ctx context.Context, userID string) error {
	if s.dailyLimit == nil {
		return nil
	}
	limit, ok, err := s.dailyLimit(ctx)
	if err != nil || !ok || limit == 0 {
		return err
	}
	sent, err := s.store.CountUserMessagesSince(ctx, userID, s.now().Add(-24*time.Hour))
	if err != nil {
		return err
	}
	if sent >= limit {
		return ErrDailyLimit
	}
	return nil
}

func (s *Service) publish(userID string, m Message) {
	if s.events == nil {
		return
	}
	event, err := realtime.NewEvent("chat.message", m.ID, m)
	if err != nil {
		slog.Error("build chat event", "message_id", m.ID, "error", err)
		return
	}
	s.events.Publish(userID, event)
}
