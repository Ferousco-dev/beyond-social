package chat

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/google/uuid"
)

// Exchange is a user message and the assistant's answer to it.
type Exchange struct {
	User      Message `json:"user"`
	Assistant Message `json:"assistant"`
}

// Send saves the user's message and answers it. Sending again with the same key
// returns the earlier answer instead of asking the model a second time.
func (s *Service) Send(ctx context.Context, userID, conversationID, content, key string, attachmentIDs []string, timeZone string) (Exchange, error) {
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

	// Everything from here asks a model, so this is what is charged for. A retry
	// that finds its earlier answer above is never charged again.
	charge, err := s.charge(ctx, userID, user.ID)
	if err != nil {
		return Exchange{}, err
	}
	exchange, err := s.respond(ctx, userID, conv, user, text, items, timeZone)
	s.closeCharge(ctx, userID, charge, err == nil)
	return exchange, err
}

// respond answers a saved message.
func (s *Service) respond(ctx context.Context, userID string, conv Conversation, user Message, text string, items []media.Item, timeZone string) (Exchange, error) {
	if s.analyzer != nil {
		if link, _, ok := analysis.FindLink(s.expandShortLinks(ctx, text)); ok {
			return s.sendLink(ctx, userID, conv, user, link)
		}
	}

	if s.analyzer != nil {
		if v, ok := firstOfKind(items, media.KindVideo); ok {
			return s.sendVideo(ctx, userID, conv, user, v)
		}
	}

	history, pending, err := s.history(ctx, userID, conv.ID, user.ID)
	if err != nil {
		return Exchange{}, err
	}
	if pinned, ok := s.contextTurn(ctx, userID, conv.ID); ok {
		// One slot goes to the pinned turn so the prompt stays the same length.
		if len(history) >= historyTurns {
			history = history[len(history)-historyTurns+1:]
		}
		history = append([]Turn{pinned}, history...)
	}
	files, err := s.readableFiles(ctx, userID, items)
	if err != nil {
		return Exchange{}, err
	}
	turn := turnInput{userID: userID, text: text, history: history, messageID: user.ID, files: files, pending: pending, now: s.localNow(timeZone)}
	if picture, ok := firstOfKind(items, media.KindImage); ok {
		turn.picture = picture.ID
	}
	reply, workflowID, script, err := s.answer(ctx, turn)
	if err != nil {
		return Exchange{}, err
	}

	assistant, err := s.store.AddAssistant(ctx, Message{
		ConversationID: conv.ID, UserID: userID, Role: RoleAssistant, Content: reply, WorkflowID: workflowID, ReplyTo: user.ID, Script: script,
	})
	if err != nil {
		return Exchange{}, err
	}
	exchange := s.finishTurn(ctx, userID, conv, user, assistant)
	go s.summarizeOlder(userID, conv.ID)
	return exchange, nil
}

// charge takes the credits for one answer. Each attempt is charged on its own,
// so one that fails is returned in full and a later retry pays once.
func (s *Service) charge(ctx context.Context, userID, messageID string) (string, error) {
	if s.billing == nil {
		return "", nil
	}
	id := "chat:" + messageID + ":" + uuid.NewString()
	return id, s.billing.Reserve(ctx, userID, id)
}

func (s *Service) closeCharge(ctx context.Context, userID, charge string, delivered bool) {
	if charge == "" {
		return
	}
	// A client that hung up must still get its credit back.
	if err := s.billing.Close(context.WithoutCancel(ctx), userID, charge, delivered); err != nil {
		slog.Error("close chat charge", "charge", charge, "error", err)
	}
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

// turnInput is what answering one message needs.
type turnInput struct {
	userID, text, messageID string
	history                 []Turn
	files                   []gemini.Media
	// pending is the script the assistant showed last, still waiting for an answer.
	pending *Script
	// picture is a picture attached to this message, if any.
	picture string
	// now is the time where the user is.
	now time.Time
}

func (s *Service) answer(ctx context.Context, t turnInput) (reply, workflowID string, script *Script, err error) {
	decision, err := s.router.Route(ctx, RouteInput{History: t.history, Message: t.text, Files: t.files, Now: t.now})
	if err != nil {
		alerts.Report(ctx, s.alerts, err, alerts.Context{Source: "chat", UserID: t.userID})
		return "", "", nil, err
	}
	if decision.Script && s.writer != nil {
		written, err := s.writer.Write(ctx, t.history, t.text, t.files)
		if err != nil {
			alerts.Report(ctx, s.alerts, err, alerts.Context{Source: "chat script", UserID: t.userID})
			return "", "", nil, err
		}
		if t.picture != "" {
			written.ImageMediaID = t.picture
		} else if t.pending != nil {
			written.ImageMediaID = t.pending.ImageMediaID // a revision keeps the picture
		}
		return written.Describe(), "", &written, nil
	}
	if decision.Remember != "" && s.memory != nil && s.memory.Remember(ctx, t.userID, decision.Remember) {
		decision.Reply = savedNote(decision.Reply)
	}
	if !decision.Create && !decision.Script {
		return decision.Reply, "", nil, nil
	}
	// Accepting the script on screen builds the plan from that script, so what
	// was approved is exactly what gets made.
	if decision.Create && t.pending != nil && s.scripts != nil {
		outcome, err := s.scripts.PlanScript(ctx, t.userID, *t.pending, decision.Post, "chat:"+t.messageID)
		if errors.Is(err, ErrScriptTooLong) {
			return "That script is longer than I can make in one go (about two minutes at most). Shall I shorten it?", "", nil, nil
		}
		if err != nil {
			return "", "", nil, err
		}
		return outcome.Reply, outcome.WorkflowID, nil, nil
	}
	outcome, err := s.planner.Plan(ctx, t.userID, t.text, t.history, "chat:"+t.messageID)
	if err != nil {
		return "", "", nil, err
	}
	return outcome.Reply, outcome.WorkflowID, nil, nil
}

// savedNote tells the user something was kept, on a reply that may be empty.
func savedNote(reply string) string {
	const note = "Saved to your memory. You can review it in Settings."
	if reply == "" {
		return note
	}
	return reply + "\n\n" + note
}

// history is the recent thread before the message being answered.
func (s *Service) history(ctx context.Context, userID, conversationID, exceptID string) ([]Turn, *Script, error) {
	msgs, err := s.store.Messages(ctx, userID, conversationID, historyTurns+1)
	if err != nil {
		return nil, nil, err
	}
	var pending *Script
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i].ID != exceptID && msgs[i].Role == RoleAssistant {
			pending = msgs[i].Script // only the latest assistant message counts
			break
		}
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
	return turns, pending, nil
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

// localNow is the current time where the user is, or UTC when the zone is
// missing or unknown.
func (s *Service) localNow(zone string) time.Time {
	if loc, err := time.LoadLocation(zone); err == nil && zone != "" {
		return s.now().In(loc)
	}
	return s.now().UTC()
}
