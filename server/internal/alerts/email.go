package alerts

import (
	"context"
	"errors"
	"strings"
)

// EmailSender emails an alert to the address an admin set in the console. The
// address is read for each alert, so it can be changed without a restart. With
// no address set it does nothing.
type EmailSender struct {
	To   func(ctx context.Context) string
	Mail func(ctx context.Context, to string, a Alert) error
}

func (e *EmailSender) Send(ctx context.Context, a Alert) error {
	if e == nil || e.To == nil || e.Mail == nil {
		return nil
	}
	to := strings.TrimSpace(e.To(ctx))
	if to == "" {
		return nil
	}
	return e.Mail(ctx, to, a)
}

// Senders delivers an alert through each sender in turn. One failing does not
// stop the others; their errors are returned together.
type Senders []Sender

func (s Senders) Send(ctx context.Context, a Alert) error {
	var errs []error
	for _, sender := range s {
		if sender == nil {
			continue
		}
		if err := sender.Send(ctx, a); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}
