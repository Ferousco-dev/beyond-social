package sandbox

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
)

type checkout struct {
	mode, success, reference, userID string
	amount                           int
	currency                         string
}

// mountPayments fakes Stripe. Checkout gives a page with one button; pressing
// it sends the product the same signed events Stripe would, then returns the
// person to the success address.
func (s *Server) mountPayments(mux *http.ServeMux) {
	mux.HandleFunc("POST /stripe/checkout/sessions", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": map[string]string{"message": "bad form"}})
			return
		}
		amount, _ := strconv.Atoi(r.PostForm.Get("line_items[0][price_data][unit_amount]"))
		c := checkout{
			mode: r.PostForm.Get("mode"), success: r.PostForm.Get("success_url"), reference: r.PostForm.Get("client_reference_id"),
			userID: r.PostForm.Get("metadata[user_id]"), amount: amount, currency: r.PostForm.Get("line_items[0][price_data][currency]"),
		}
		session := id("cs_sbx")
		s.mu.Lock()
		s.pay[session] = c
		s.mu.Unlock()
		writeJSON(w, http.StatusOK, map[string]string{"id": session, "url": s.Base + "/stripe/pay/" + session})
	})
	mux.HandleFunc("GET /stripe/pay/{id}", func(w http.ResponseWriter, r *http.Request) {
		c, ok := s.session(r.PathValue("id"))
		if !ok {
			notFound(w)
			return
		}
		page(w, "Sandbox checkout", fmt.Sprintf("%s of %s %.2f. No card is charged.", c.mode, strings.ToUpper(c.currency), float64(c.amount)/100), "/stripe/pay/"+r.PathValue("id"), "Pay in the sandbox")
	})
	mux.HandleFunc("POST /stripe/pay/{id}", func(w http.ResponseWriter, r *http.Request) {
		c, ok := s.session(r.PathValue("id"))
		if !ok {
			notFound(w)
			return
		}
		if err := s.completeCheckout(r.PathValue("id"), c); err != nil {
			http.Error(w, "the product did not accept the payment event: "+err.Error(), http.StatusBadGateway)
			return
		}
		http.Redirect(w, r, c.success, http.StatusSeeOther)
	})
	mux.HandleFunc("POST /stripe/billing_portal/sessions", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		writeJSON(w, http.StatusOK, map[string]string{"url": s.Base + "/stripe/portal?customer=" + url.QueryEscape(r.PostForm.Get("customer")) + "&return=" + url.QueryEscape(r.PostForm.Get("return_url"))})
	})
	mux.HandleFunc("GET /stripe/portal", func(w http.ResponseWriter, r *http.Request) {
		page(w, "Sandbox billing portal", "Cancelling here ends the membership at once.", "/stripe/portal?"+r.URL.RawQuery, "Cancel membership")
	})
	mux.HandleFunc("POST /stripe/portal", func(w http.ResponseWriter, r *http.Request) {
		customer := r.URL.Query().Get("customer")
		user := strings.TrimPrefix(customer, "cus_sbx_")
		err := s.send("customer.subscription.deleted", map[string]any{"id": "sub_sbx_" + user, "customer": customer, "status": "canceled", "metadata": map[string]string{"user_id": user}})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		http.Redirect(w, r, r.URL.Query().Get("return"), http.StatusSeeOther)
	})
}

func (s *Server) session(key string) (checkout, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.pay[key]
	return c, ok
}

func (s *Server) completeCheckout(session string, c checkout) error {
	if c.mode != "subscription" {
		return s.send("checkout.session.completed", map[string]any{"id": session, "mode": "payment", "payment_status": "paid", "payment_intent": "pi_sbx_" + session, "client_reference_id": c.reference})
	}
	customer, subscription := "cus_sbx_"+c.userID, "sub_sbx_"+c.userID
	steps := []struct {
		kind string
		obj  map[string]any
	}{
		{"checkout.session.completed", map[string]any{"id": session, "mode": "subscription", "payment_status": "paid", "customer": customer, "subscription": subscription, "client_reference_id": c.userID}},
		{"customer.subscription.updated", map[string]any{"id": subscription, "customer": customer, "status": "active", "current_period_end": time.Now().Add(30 * 24 * time.Hour).Unix(), "metadata": map[string]string{"user_id": c.userID}}},
		{"invoice.paid", map[string]any{"id": "in_sbx_" + session, "customer": customer, "amount_paid": c.amount, "currency": c.currency}},
	}
	for _, step := range steps {
		if err := s.send(step.kind, step.obj); err != nil {
			return err
		}
	}
	return nil
}

// send delivers one signed event to the product, as Stripe's webhook would.
func (s *Server) send(kind string, object map[string]any) error {
	body, err := json.Marshal(map[string]any{"id": id("evt"), "type": kind, "data": map[string]any{"object": object}})
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, s.APIBase+"/api/v1/callbacks/stripe", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Stripe-Signature", billing.Sign(body, s.WebhookSecret, time.Now()))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		return fmt.Errorf("%s -> %d %s", kind, resp.StatusCode, detail)
	}
	return nil
}

func page(w http.ResponseWriter, title, text, action, button string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!doctype html><meta charset="utf-8"><title>%[1]s</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem"><h1>%[1]s</h1><p>%[2]s</p><form method="post" action="%[3]s"><button style="font-size:1rem;padding:.7rem 1.2rem">%[4]s</button></form>`,
		html.EscapeString(title), html.EscapeString(text), html.EscapeString(action), html.EscapeString(button))
}
