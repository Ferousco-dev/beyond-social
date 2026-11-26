package mailer

import (
	"context"
	"fmt"
	"strings"
)

// providerNames is how each provider is written in an email.
var providerNames = map[string]string{
	"kie":    "KIE",
	"apify":  "Apify",
	"gemini": "Gemini",
	"resend": "Resend",
	"stripe": "Stripe",
}

func providerName(name string) string {
	if known, ok := providerNames[strings.ToLower(name)]; ok {
		return known
	}
	if name == "" {
		return "A provider"
	}
	return strings.ToUpper(name[:1]) + name[1:]
}

// alertLetter is the email an admin gets when a provider needs them: what is
// wrong in one sentence, what to do in another, and a link to the alerts page.
func alertLetter(providerKey, kind string, count int) letter {
	name := providerName(providerKey)
	l := letter{button: "Open alerts", path: "/dashboard/admin/alerts"}
	if kind == "quota" {
		l.subject = name + " is running out of credit"
		l.heading = name + " is running out of credit"
		l.body = []string{name + " is low or out of credit, so the features that use it will stop working.", "Top up the account to keep everything running."}
	} else {
		l.subject = name + " refused its key"
		l.heading = name + " refused its key"
		l.body = []string{name + " is not accepting the key it was given, so the features that use it have stopped.", "Replace the key in Provider keys to fix it."}
	}
	if count > 1 {
		l.body = append(l.body, fmt.Sprintf("This has happened %d times so far.", count))
	}
	return l
}

// AdminAlert emails an operator about a provider problem. Unlike the other
// emails it runs in the caller and returns its error, so the alert service
// can log a failed delivery.
func (n *Notifier) AdminAlert(ctx context.Context, to, providerKey, kind string, count int) error {
	l := alertLetter(providerKey, kind, count)
	return n.sender.Send(ctx, Message{To: to, Subject: l.subject, Text: l.text(n.appURL), HTML: l.render(n.appURL)})
}

// AlertTest is sent when an admin saves the alert address, so they see what an alert looks like.
func (n *Notifier) AlertTest(ctx context.Context, to string) error {
	l := letter{
		subject: "Alerts will come to this address",
		heading: "Alerts will come here",
		body:    []string{"When a provider runs low on credit or refuses its key, we will email this address.", "Nothing is wrong right now."},
		button:  "Open alerts",
		path:    "/dashboard/admin/alerts",
	}
	return n.sender.Send(ctx, Message{To: to, Subject: l.subject, Text: l.text(n.appURL), HTML: l.render(n.appURL)})
}
