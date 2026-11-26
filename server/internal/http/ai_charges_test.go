package httpserver

import (
	"context"
	"net/http"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/autofill"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

type fakeAutofill struct{ err error }

func (f fakeAutofill) Fill(context.Context, string, string, int) (autofill.Brief, error) {
	return autofill.Brief{Title: "Cake"}, f.err
}

func (f fakeAutofill) Captions(context.Context, string, []string) (map[string]autofill.Post, error) {
	return map[string]autofill.Post{"tiktok": {Text: "Fresh cake"}}, f.err
}

// Every AI action costs credits: filling the form and writing a caption are
// kept when they deliver and refunded when they fail.
func TestFillingTheFormAndWritingACaptionAreChargedAndRefundedOnFailure(t *testing.T) {
	for _, tc := range []struct {
		name, path, body string
		biller           func(*Deps, ResourceBiller)
	}{
		{"autofill", "/api/v1/compose/brief", `{"idea":"a cake promo","seconds":8}`, func(d *Deps, b ResourceBiller) { d.AutofillBiller = b }},
		{"caption", "/api/v1/compose/caption", `{"about":"a cake promo","platforms":["tiktok"]}`, func(d *Deps, b ResourceBiller) { d.CaptionWriteBiller = b }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h := newHarness(t, &fakeRepo{}, fakePinger{})
			biller := &fakeBiller{}
			h.deps.Autofill = fakeAutofill{}
			tc.biller(&h.deps, biller)
			h.rebuild()
			a := h.token(t, alice)

			if res := send(h, http.MethodPost, tc.path, a, tc.body); res.Code != http.StatusOK {
				t.Fatalf("ok: %d %s", res.Code, res.Body)
			}
			if len(biller.closed) != 1 || !biller.closed[0] {
				t.Fatalf("a delivered answer was not kept: %v", biller.closed)
			}

			h.deps.Autofill = fakeAutofill{err: autofill.ErrUnavailable}
			h.rebuild()
			if res := send(h, http.MethodPost, tc.path, a, tc.body); res.Code != http.StatusBadGateway {
				t.Fatalf("failure: %d", res.Code)
			}
			if len(biller.closed) != 2 || biller.closed[1] {
				t.Fatalf("a failed answer was charged: %v", biller.closed)
			}

			biller.reserveErr = credits.ErrInsufficient
			if res := send(h, http.MethodPost, tc.path, a, tc.body); res.Code < 400 {
				t.Fatalf("an empty balance still got an answer: %d", res.Code)
			}
		})
	}
}
