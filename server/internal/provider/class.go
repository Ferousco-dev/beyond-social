package provider

import (
	"errors"
	"net/http"
	"strings"
)

// Class says what kind of problem a provider failure is, which decides who
// needs to hear about it. Users never see provider text; operators see the class.
type Class string

const (
	// ClassTransient is worth retrying: a timeout, an outage, a rate limit.
	ClassTransient Class = "transient"
	// ClassQuota means we ran out of credit, quota or billing with the provider.
	// Nothing the user does fixes it, so an admin must be told.
	ClassQuota Class = "quota"
	// ClassAuth means our key is wrong, revoked or lacks permission. Also an admin problem.
	ClassAuth Class = "auth"
	// ClassRejected means the provider refused this particular request.
	ClassRejected Class = "rejected"
	ClassUnknown  Class = "unknown"
)

// NeedsAdmin reports whether the failure is one only an operator can fix.
func (c Class) NeedsAdmin() bool { return c == ClassQuota || c == ClassAuth }

var quotaHints = []string{"credit", "quota", "billing", "balance", "exhausted", "insufficient", "payment"}

// Classify inspects err for a provider failure and classifies it. An error that
// is not a provider failure is ClassUnknown.
func Classify(err error) Class {
	var pe *Error
	if !errors.As(err, &pe) {
		return ClassUnknown
	}
	if pe.Code == CodeNotConfigured {
		return ClassAuth
	}
	text := strings.ToLower(pe.Message + " " + pe.Code)
	hinted := false
	for _, h := range quotaHints {
		if strings.Contains(text, h) {
			hinted = true
			break
		}
	}
	switch {
	case pe.Status == http.StatusPaymentRequired, hinted && pe.Status != http.StatusUnauthorized:
		return ClassQuota
	case pe.Status == http.StatusUnauthorized, pe.Status == http.StatusForbidden:
		return ClassAuth
	case pe.Transient:
		return ClassTransient
	case pe.Status >= 400 && pe.Status < 500:
		return ClassRejected
	}
	return ClassUnknown
}

// UserMessage is the only thing a user is ever told about a provider failure.
const UserMessage = "Something went wrong on our side. Please try again later, or contact support if it keeps happening."
