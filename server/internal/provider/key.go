package provider

import "context"

// KeyFunc supplies a provider credential at the moment of a request, so a key an
// admin pastes in takes effect without a restart.
type KeyFunc func(ctx context.Context) (string, error)

// StaticKey always returns k. For tests and for keys fixed at startup.
func StaticKey(k string) KeyFunc {
	return func(context.Context) (string, error) { return k, nil }
}

// CodeNotConfigured marks the error returned when no key has been set.
const CodeNotConfigured = "not_configured"

// ErrNotConfigured is returned when a provider's key has not been set. It is
// classified as an admin problem, so the admin is told to plug the key in while
// the user sees the generic message.
func ErrNotConfigured(name string) *Error {
	return &Error{Provider: name, Code: CodeNotConfigured, Message: "no API key is configured"}
}
