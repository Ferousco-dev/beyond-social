// Package alerts tells operators about failures only they can fix, such as a
// provider account that has run out of credit or a key that was revoked. Users
// are never shown these details; they get provider.UserMessage.
package alerts

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Alert is one open problem. Repeats of the same problem (same kind and
// provider) update the existing alert instead of creating a flood.
type Alert struct {
	ID         string     `json:"id"`
	Kind       string     `json:"kind"`
	Provider   string     `json:"provider"`
	Message    string     `json:"message"`
	UserID     string     `json:"last_user_id,omitempty"`
	Resource   string     `json:"last_resource,omitempty"`
	Count      int        `json:"count"`
	FirstSeen  time.Time  `json:"first_seen"`
	LastSeen   time.Time  `json:"last_seen"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty"`
}

type Store interface {
	// Record upserts the open alert for (kind, provider). notify is true when
	// operators should be told now: it is new, was resolved before, or was last
	// announced over an hour ago.
	Record(ctx context.Context, a Alert) (saved Alert, notify bool, err error)
	List(ctx context.Context, openOnly bool, limit int) ([]Alert, error)
	Resolve(ctx context.Context, id string) (bool, error)
}

// Sender delivers an alert out of band (a chat webhook, for example).
type Sender interface {
	Send(ctx context.Context, a Alert) error
}

// Context says where a failure happened.
type Context struct {
	Source   string // e.g. "avatar video"
	UserID   string
	Resource string
}

// Reporter is what the rest of the service calls when a provider call fails.
type Reporter interface {
	// Report classifies err, alerts operators if only they can fix it, and
	// returns the class so the caller can decide what to tell the user.
	Report(ctx context.Context, err error, c Context) provider.Class
}

type Service struct {
	store  Store
	sender Sender // optional
}

func NewService(store Store, sender Sender) *Service { return &Service{store: store, sender: sender} }

// Report never fails the caller: alerting is best effort and must not turn a
// handled failure into an unhandled one.
func (s *Service) Report(ctx context.Context, err error, c Context) provider.Class {
	class := provider.Classify(err)
	if s == nil || !class.NeedsAdmin() {
		return class
	}
	var pe *provider.Error
	name := "unknown"
	if errors.As(err, &pe) && pe.Provider != "" {
		name = pe.Provider
	}
	alert := Alert{
		Kind: string(class), Provider: name, UserID: c.UserID, Resource: c.Resource,
		Message: fmt.Sprintf("%s: %s (%s)", name, describe(class), c.Source),
	}
	// Detached from the request: the alert matters even if the user hangs up.
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	saved, notify, serr := s.store.Record(saveCtx, alert)
	slog.Error("admin alert", "kind", alert.Kind, "provider", name, "source", c.Source, "count", saved.Count, "error", serr)
	if serr == nil && notify && s.sender != nil {
		if err := s.sender.Send(saveCtx, saved); err != nil {
			slog.Warn("alert delivery failed", "error", err)
		}
	}
	return class
}

func (s *Service) List(ctx context.Context, openOnly bool, limit int) ([]Alert, error) {
	return s.store.List(ctx, openOnly, limit)
}

func (s *Service) Resolve(ctx context.Context, id string) (bool, error) {
	return s.store.Resolve(ctx, id)
}

func describe(c provider.Class) string {
	if c == provider.ClassQuota {
		return "out of credit or quota; top up the account"
	}
	return "authentication failed; check the API key"
}
