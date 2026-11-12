package mailer

import (
	"html"
	"strings"
)

// letter is one email before it is dressed as text or HTML.
type letter struct {
	subject string
	heading string
	body    []string // paragraphs
	button  string   // label of the one action
	path    string   // where the action goes, relative to the app
}

const (
	brandBlue = "#2563eb"
	inkColor  = "#0f172a"
	softColor = "#64748b"
)

func (l letter) text(appURL string) string {
	return strings.Join(l.body, "\n\n") + "\n\n" + l.button + ": " + appURL + l.path + signoff
}

// render builds the HTML version. Everything is inline and table based because
// mail apps ignore most modern CSS. The logo is a small hosted copy.
func (l letter) render(appURL string) string {
	var paras strings.Builder
	for _, p := range l.body {
		paras.WriteString(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:` + inkColor + `">` + html.EscapeString(p) + `</p>`)
	}
	link := html.EscapeString(appURL + l.path)
	return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9">` +
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px"><tr><td align="center">` +
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">` +
		`<tr><td style="padding-bottom:24px"><img src="` + html.EscapeString(appURL) + `/brand/email-logo.png" width="40" height="40" alt="Beyond Social" style="display:block;border:0"></td></tr>` +
		`<tr><td><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:` + inkColor + `">` + html.EscapeString(l.heading) + `</h1>` + paras.String() + `</td></tr>` +
		`<tr><td style="padding-top:8px"><a href="` + link + `" style="display:inline-block;background:` + brandBlue + `;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">` + html.EscapeString(l.button) + `</a></td></tr>` +
		`<tr><td style="padding-top:32px;font-size:13px;color:` + softColor + `">Beyond Social</td></tr>` +
		`</table></td></tr></table></body></html>`
}
