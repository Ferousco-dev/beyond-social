package mailer

import (
	"fmt"
	"strings"
	"time"
)

const signoff = "\n\nBeyond Social"

func money(cents int, currency string) string {
	return fmt.Sprintf("%s %.2f", strings.ToUpper(currency), float64(cents)/100)
}

// PackBought thanks someone for buying credits.
func (n *Notifier) PackBought(userID, pack string, credits, cents int, currency string) {
	n.send(userID, letter{
		subject: "Your credits are added",
		heading: "Your credits are in",
		body:    []string{fmt.Sprintf("Thank you. %d credits from the %s pack (%s) are now in your account.", credits, pack, money(cents, currency))},
		button:  "See your balance",
		path:    "/dashboard/settings/billing",
	})
}

// ProStarted welcomes a new Pro member.
func (n *Notifier) ProStarted(userID string) {
	n.send(userID, letter{
		subject: "Welcome to Pro",
		heading: "Welcome to Pro",
		body:    []string{"Your Pro plan is active. Everything is unlocked, with no credits to count.", "Your usage refills every five hours and every Monday."},
		button:  "See your usage",
		path:    "/dashboard/usage",
	})
}

// PaymentFailed tells a Pro member their renewal did not go through.
func (n *Notifier) PaymentFailed(userID string) {
	n.send(userID, letter{
		subject: "We could not renew your Pro plan",
		heading: "Your payment did not go through",
		body:    []string{"Your last payment did not go through, so your Pro plan is on hold.", "Update your card to keep it, and we will try again."},
		button:  "Update your card",
		path:    "/dashboard/settings/billing",
	})
}

// ProEnded says Pro has finished.
func (n *Notifier) ProEnded(userID string) {
	n.send(userID, letter{
		subject: "Your Pro plan has ended",
		heading: "Your Pro plan has ended",
		body:    []string{"Your account is on the Free plan now. Your work is safe.", "You can upgrade again whenever you like."},
		button:  "Upgrade",
		path:    "/pricing",
	})
}

// VideoReady tells someone their video finished, when they asked to be told.
func (n *Notifier) VideoReady(userID string) {
	n.send(userID, letter{
		subject: "Your video is ready",
		heading: "Your video is ready",
		body:    []string{"Your video finished generating and is waiting in your projects."},
		button:  "Watch it",
		path:    "/dashboard/projects",
	})
}

// LimitReached tells a Pro member a usage limit is full and when it refills.
func (n *Notifier) LimitReached(userID, window string, resetsAt time.Time) {
	name := "five hour session"
	if window == "week" {
		name = "weekly"
	}
	n.send(userID, letter{
		subject: "You have reached your usage limit",
		heading: "You have reached your limit",
		body: []string{
			fmt.Sprintf("You have used your %s limit. It refills %s UTC.", name, resetsAt.UTC().Format("Mon 2 Jan at 15:04")),
			"You can wait, or turn on extra usage to keep going on credits.",
		},
		button: "See your usage",
		path:   "/dashboard/usage",
	})
}
