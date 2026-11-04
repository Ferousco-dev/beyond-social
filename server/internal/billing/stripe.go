package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	stripeName = "stripe"
	stripeBase = "https://api.stripe.com/v1"
)

// Stripe is a small client for the two calls billing needs. It speaks Stripe's
// form-encoded API directly, so there is no SDK to keep up to date.
type Stripe struct {
	key  provider.KeyFunc
	base string
	http *http.Client
}

func NewStripe(key provider.KeyFunc) *Stripe {
	return &Stripe{key: key, base: stripeBase, http: &http.Client{Timeout: 20 * time.Second}}
}

// WithBase points the client somewhere else, for tests.
func (s *Stripe) WithBase(base string, client *http.Client) *Stripe {
	s.base = strings.TrimRight(base, "/")
	if client != nil {
		s.http = client
	}
	return s
}

func (s *Stripe) do(ctx context.Context, method, path string, form url.Values, idempotencyKey string) ([]byte, error) {
	key, err := s.key(ctx)
	if err != nil {
		return nil, err
	}
	var body io.Reader
	if form != nil {
		body = strings.NewReader(form.Encode())
	}
	req, err := http.NewRequestWithContext(ctx, method, s.base+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	if form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, &provider.Error{Provider: stripeName, Message: "request failed", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, &provider.Error{Provider: stripeName, Message: "could not read the reply", Transient: true, Err: err}
	}
	if resp.StatusCode >= 300 {
		var e struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(raw, &e)
		detail := e.Error.Message
		if len(detail) > 300 {
			detail = detail[:300]
		}
		return nil, provider.FromHTTPStatus(stripeName, resp.StatusCode, detail)
	}
	return raw, nil
}

// CreateCheckout opens a one-time payment page for a pack. The pack's price is
// sent inline, so nothing has to be created in the Stripe dashboard first.
func (s *Stripe) CreateCheckout(ctx context.Context, in CheckoutInput) (string, string, error) {
	form := url.Values{
		"mode":                 {"payment"},
		"success_url":          {in.SuccessURL},
		"cancel_url":           {in.CancelURL},
		"client_reference_id":  {in.PaymentID},
		"customer_email":       {in.Email},
		"metadata[payment_id]": {in.PaymentID},
		"metadata[user_id]":    {in.UserID},
		"payment_intent_data[metadata][payment_id]":     {in.PaymentID},
		"line_items[0][quantity]":                       {"1"},
		"line_items[0][price_data][currency]":           {in.Currency},
		"line_items[0][price_data][unit_amount]":        {strconv.Itoa(in.AmountCents)},
		"line_items[0][price_data][product_data][name]": {fmt.Sprintf("%s: %d credits", in.PackName, in.Credits)},
	}
	if in.Email == "" {
		form.Del("customer_email")
	}
	if in.Tax {
		form.Set("automatic_tax[enabled]", "true")
	}
	raw, err := s.do(ctx, http.MethodPost, "/checkout/sessions", form, "checkout:"+in.PaymentID)
	if err != nil {
		return "", "", err
	}
	var out struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || out.ID == "" || !strings.HasPrefix(out.URL, "https://") {
		return "", "", fmt.Errorf("billing: stripe returned an unreadable session")
	}
	return out.ID, out.URL, nil
}

// CreateSubscription opens a monthly membership payment page. As with packs the
// price is sent inline, so nothing has to exist in the Stripe dashboard first.
func (s *Stripe) CreateSubscription(ctx context.Context, in SubscribeInput) (string, string, error) {
	form := url.Values{
		"mode":                                           {"subscription"},
		"success_url":                                    {in.SuccessURL},
		"cancel_url":                                     {in.CancelURL},
		"client_reference_id":                            {in.UserID},
		"metadata[user_id]":                              {in.UserID},
		"subscription_data[metadata][user_id]":           {in.UserID},
		"line_items[0][quantity]":                        {"1"},
		"line_items[0][price_data][currency]":            {in.Currency},
		"line_items[0][price_data][unit_amount]":         {strconv.Itoa(in.PriceCents)},
		"line_items[0][price_data][recurring][interval]": {"month"},
		"line_items[0][price_data][product_data][name]":  {"Beyond Social Pro"},
	}
	if in.Tax {
		form.Set("automatic_tax[enabled]", "true")
	}
	switch {
	case in.Customer != "":
		form.Set("customer", in.Customer)
	case in.Email != "":
		form.Set("customer_email", in.Email)
	}
	raw, err := s.do(ctx, http.MethodPost, "/checkout/sessions", form, "")
	if err != nil {
		return "", "", err
	}
	var out struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || out.ID == "" || !strings.HasPrefix(out.URL, "https://") {
		return "", "", fmt.Errorf("billing: stripe returned an unreadable session")
	}
	return out.ID, out.URL, nil
}

// CreatePortal opens Stripe's customer page, where a card is changed or a plan cancelled.
func (s *Stripe) CreatePortal(ctx context.Context, customer, returnURL string) (string, error) {
	raw, err := s.do(ctx, http.MethodPost, "/billing_portal/sessions", url.Values{"customer": {customer}, "return_url": {returnURL}}, "")
	if err != nil {
		return "", err
	}
	var out struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || !strings.HasPrefix(out.URL, "https://") {
		return "", fmt.Errorf("billing: stripe returned an unreadable portal")
	}
	return out.URL, nil
}
