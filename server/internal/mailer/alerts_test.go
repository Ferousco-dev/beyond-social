package mailer

import (
	"strings"
	"testing"
)

func TestAlertLetterSaysWhatIsWrongAndWhatToDo(t *testing.T) {
	quota := alertLetter("kie", "quota", 1)
	if quota.subject != "KIE is running out of credit" || !strings.Contains(strings.Join(quota.body, " "), "Top up") {
		t.Fatalf("quota letter = %+v", quota)
	}
	auth := alertLetter("apify", "auth", 3)
	body := strings.Join(auth.body, " ")
	if auth.subject != "Apify refused its key" || !strings.Contains(body, "Replace the key") || !strings.Contains(body, "3 times") {
		t.Fatalf("auth letter = %+v", auth)
	}
	html := quota.render("https://app.example.com")
	if !strings.Contains(html, "/brand/email-logo.png") || !strings.Contains(html, "/dashboard/admin/alerts") {
		t.Fatal("the email is missing the logo or the link to alerts")
	}
}
