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
	n.send(userID, func() (string, string) {
		return "Your credits are added", fmt.Sprintf("Thank you. %d credits from the %s pack (%s) are now in your account.\n\nSee your balance: %s/dashboard/credits%s",
			credits, pack, money(cents, currency), n.appURL, signoff)
	})
}

// ProStarted welcomes a new Pro member.
func (n *Notifier) ProStarted(userID string) {
	n.send(userID, func() (string, string) {
		return "Welcome to Pro", fmt.Sprintf("Your Pro plan is active. Everything is unlocked, with no watermark and no credits to count. Your usage refills every five hours and every Monday.\n\nSee your usage: %s/dashboard/usage\nManage your plan: %s/dashboard/settings/billing%s", n.appURL, n.appURL, signoff)
	})
}

// PaymentFailed tells a Pro member their renewal did not go through.
func (n *Notifier) PaymentFailed(userID string) {
	n.send(userID, func() (string, string) {
		return "We could not renew your Pro plan", fmt.Sprintf("Your last payment did not go through, so your Pro plan is on hold. Update your card to keep it, and we will try again.\n\nUpdate your card: %s/dashboard/settings/billing%s", n.appURL, signoff)
	})
}

// ProEnded says Pro has finished.
func (n *Notifier) ProEnded(userID string) {
	n.send(userID, func() (string, string) {
		return "Your Pro plan has ended", fmt.Sprintf("Your Pro plan has ended and your account is on the Free plan. Your work is safe. You can upgrade again whenever you like.\n\nUpgrade: %s/pricing%s", n.appURL, signoff)
	})
}

// LimitReached tells a Pro member a usage limit is full and when it refills.
func (n *Notifier) LimitReached(userID, window string, resetsAt time.Time) {
	n.send(userID, func() (string, string) {
		name := "five hour session"
		if window == "week" {
			name = "weekly"
		}
		return "You have reached your usage limit", fmt.Sprintf("You have used your %s limit. It refills %s UTC. You can wait, or turn on extra usage to keep going on credits.\n\nSee your usage: %s/dashboard/usage%s",
			name, resetsAt.UTC().Format("Mon 2 Jan at 15:04"), n.appURL, signoff)
	})
}
