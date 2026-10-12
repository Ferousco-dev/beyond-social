// Package provider defines how third-party failures are classified.
package provider

import (
	"errors"
	"fmt"
)

// Error is a failure talking to an external provider. Message is for logs
// only; callers show users a generic sentence, never this text.
type Error struct {
	Provider  string
	Status    int
	Message   string
	Transient bool
	// Code is the provider's own machine-readable error code, when it sent one.
	Code string
}

func (e *Error) Error() string {
	return fmt.Sprintf("%s: %s (status %d, transient=%t)", e.Provider, e.Message, e.Status, e.Transient)
}

// Code returns the provider error code carried by err, or "".
func Code(err error) string {
	var pe *Error
	if errors.As(err, &pe) {
		return pe.Code
	}
	return ""
}

// IsTransient reports whether retrying the same request later may succeed.
func IsTransient(err error) bool {
	var pe *Error
	return errors.As(err, &pe) && pe.Transient
}

// FromHTTPStatus classifies an unsuccessful HTTP status. Rate limits and server
// errors are worth retrying; anything else means the request or credentials are wrong.
func FromHTTPStatus(name string, status int, detail string) *Error {
	transient := status == 429 || status == 408 || status >= 500
	return &Error{Provider: name, Status: status, Message: detail, Transient: transient}
}
