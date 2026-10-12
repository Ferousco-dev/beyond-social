// Package httpserver wires the REST API and WebSocket endpoint.
package httpserver

import (
	"context"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/handoff"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

// Pinger reports whether a dependency is reachable; *pgxpool.Pool satisfies it.
type Pinger interface {
	Ping(ctx context.Context) error
}

type Deps struct {
	Jobs       *jobs.Service
	Discovery  *discovery.Service
	Transform  *transform.Service
	Reconciler Reconciler
	// Webhook secrets are read per request so an admin can rotate them live.
	WebhookHMACKey func(ctx context.Context) string
	Workflows      WorkflowService

	Accounts            *accounts.Service
	Alerts              *alerts.Service
	Avatars             *avatars.Service
	Handoff             *handoff.Service
	Voices              *voices.Service
	AvatarVideo         *avatarvideo.Service
	Videos              VideoReader
	VideoReconciler     VideoReconciler
	HeygenWebhookSecret func(ctx context.Context) string
	Vault               CredentialVault
	Credits             CreditReader
	CreditAdmin         CreditAdmin
	CreditLedger        CreditLedger
	Probe               CredentialProbe
	Audit               Auditor
	Verifier            *auth.Verifier
	Database            Pinger
	Hub                 *realtime.Hub
	AllowedOrigins      []string
}

type App struct {
	deps Deps
}

func NewApp(deps Deps) *App { return &App{deps: deps} }

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()

	// Unauthenticated: probes and the WebSocket, which authenticates in-band.
	mux.HandleFunc("GET /health", a.health)
	mux.HandleFunc("GET /ready", a.ready)
	mux.Handle("GET /ws", realtime.NewHandler(realtime.Options{
		Hub:            a.deps.Hub,
		Verifier:       a.deps.Verifier,
		AllowedOrigins: a.deps.AllowedOrigins,
	}))

	// Authenticated by KIE's signature (and re-verified against KIE's API), not a user token.
	mux.HandleFunc("POST /api/v1/callbacks/kie", a.kieCallback)

	mux.HandleFunc("POST /api/v1/callbacks/heygen", a.heygenCallback)

	// The phone that scans the QR has no session; its token is the capability.
	// It calls the API from the browser, so these routes allow the frontend origin.
	cors := func(h http.HandlerFunc) http.Handler { return withCORS(a.deps.AllowedOrigins, h) }
	mux.Handle("GET /api/v1/handoffs/{token}", cors(a.handoffStatus))
	mux.Handle("POST /api/v1/handoffs/{token}/ticket", cors(a.handoffTicket))
	mux.Handle("POST /api/v1/handoffs/{token}/claim", cors(a.handoffClaim))
	mux.Handle("OPTIONS /api/v1/handoffs/{token}", cors(func(http.ResponseWriter, *http.Request) {}))
	mux.Handle("OPTIONS /api/v1/handoffs/{token}/ticket", cors(func(http.ResponseWriter, *http.Request) {}))
	mux.Handle("OPTIONS /api/v1/handoffs/{token}/claim", cors(func(http.ResponseWriter, *http.Request) {}))

	authenticated := auth.Middleware(a.deps.Verifier, writeUnauthorized)
	protected := func(h http.Handler) http.Handler { return authenticated(a.requireActiveAccount(h)) }
	mux.Handle("GET /api/v1/me", protected(http.HandlerFunc(a.me)))
	mux.Handle("GET /api/v1/jobs", protected(http.HandlerFunc(a.listJobs)))
	mux.Handle("GET /api/v1/jobs/{id}", protected(http.HandlerFunc(a.getJob)))
	mux.Handle("POST /api/v1/jobs/video-transform", protected(http.HandlerFunc(a.createTransform)))
	mux.Handle("GET /api/v1/admin/alerts", protected(a.requireAdmin(a.listAlerts)))
	mux.Handle("POST /api/v1/admin/alerts/{id}/resolve", protected(a.requireAdmin(a.resolveAlert)))
	mux.Handle("GET /api/v1/credits", protected(http.HandlerFunc(a.myCredits)))
	mux.Handle("GET /api/v1/admin/credits/prices", protected(a.requireAdmin(a.listPrices)))
	mux.Handle("PUT /api/v1/admin/credits/prices/{action}", protected(a.requireAdmin(a.updatePrice)))
	mux.Handle("GET /api/v1/admin/credits/settings", protected(a.requireAdmin(a.listCreditSettings)))
	mux.Handle("PUT /api/v1/admin/credits/settings/{key}", protected(a.requireAdmin(a.updateCreditSetting)))
	mux.Handle("GET /api/v1/admin/credits/usage", protected(a.requireAdmin(a.creditUsage)))
	mux.Handle("GET /api/v1/admin/users/segments", protected(a.requireAdmin(a.userSegments)))
	mux.Handle("GET /api/v1/admin/users", protected(a.requireAdmin(a.findCreditUsers)))
	mux.Handle("GET /api/v1/admin/users/{id}/credits", protected(a.requireAdmin(a.userLedger)))
	mux.Handle("POST /api/v1/admin/users/{id}/credits", protected(a.requireAdmin(a.adjustCredits)))
	mux.Handle("GET /api/v1/admin/providers", protected(a.requireAdmin(a.listProviders)))
	mux.Handle("PUT /api/v1/admin/providers/{name}", protected(a.requireAdmin(a.setProvider)))
	mux.Handle("DELETE /api/v1/admin/providers/{name}", protected(a.requireAdmin(a.clearProvider)))
	mux.Handle("POST /api/v1/avatars/uploads", protected(http.HandlerFunc(a.uploadTicket)))
	mux.Handle("POST /api/v1/avatars/handoffs", protected(http.HandlerFunc(a.mintHandoff)))
	mux.Handle("POST /api/v1/avatars", protected(http.HandlerFunc(a.registerAvatar)))
	mux.Handle("GET /api/v1/avatars", protected(http.HandlerFunc(a.listAvatars)))
	mux.Handle("GET /api/v1/avatars/{id}", protected(http.HandlerFunc(a.getAvatar)))
	mux.Handle("DELETE /api/v1/avatars/{id}", protected(http.HandlerFunc(a.deleteAvatar)))
	mux.Handle("POST /api/v1/avatars/{id}/default", protected(http.HandlerFunc(a.setDefaultAvatar)))
	mux.Handle("POST /api/v1/avatars/{id}/consent", protected(http.HandlerFunc(a.refreshAvatarConsent)))
	mux.Handle("POST /api/v1/avatars/{id}/voice", protected(http.HandlerFunc(a.selectAvatarVoice)))
	mux.Handle("GET /api/v1/voices", protected(http.HandlerFunc(a.listVoices)))
	mux.Handle("POST /api/v1/videos/avatar", protected(http.HandlerFunc(a.createAvatarVideo)))
	mux.Handle("GET /api/v1/videos/{id}", protected(http.HandlerFunc(a.getAvatarVideo)))
	mux.Handle("POST /api/v1/discover", protected(http.HandlerFunc(a.createDiscovery)))
	mux.Handle("GET /api/v1/discover/{id}", protected(http.HandlerFunc(a.getDiscovery)))
	mux.Handle("GET /api/v1/discover/{id}/videos", protected(http.HandlerFunc(a.listDiscoveryVideos)))
	mux.Handle("POST /api/v1/workflows", protected(http.HandlerFunc(a.submitWorkflow)))
	mux.Handle("GET /api/v1/workflows", protected(http.HandlerFunc(a.listWorkflows)))
	mux.Handle("GET /api/v1/workflows/{id}", protected(http.HandlerFunc(a.getWorkflow)))
	mux.Handle("POST /api/v1/workflows/{id}/approve", protected(http.HandlerFunc(a.approveWorkflow)))
	mux.Handle("POST /api/v1/workflows/{id}/start", protected(http.HandlerFunc(a.startWorkflow)))
	mux.Handle("POST /api/v1/workflows/{id}/cancel", protected(http.HandlerFunc(a.cancelWorkflow)))
	mux.Handle("GET /api/v1/workflows/{id}/history", protected(http.HandlerFunc(a.getWorkflowHistory)))
	mux.Handle("GET /api/v1/workflows/{id}/steps/{step}", protected(http.HandlerFunc(a.getWorkflowStep)))

	return withRecover(withLogging(jsonRouting(mux)))
}

// jsonRouting makes the mux's own 404 and 405 answers follow the API error format.
func jsonRouting(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler, pattern := mux.Handler(r)
		if pattern != "" {
			mux.ServeHTTP(w, r) // ServeHTTP, not handler, so path values are populated
			return
		}
		probe := discardWriter{header: http.Header{}}
		handler.ServeHTTP(probe, r)
		if allow := probe.header.Get("Allow"); allow != "" {
			w.Header().Set("Allow", allow)
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}
		writeError(w, http.StatusNotFound, "not_found", "no such route")
	})
}

// discardWriter captures only the headers the mux sets on a routing failure.
type discardWriter struct{ header http.Header }

func (d discardWriter) Header() http.Header       { return d.header }
func (discardWriter) Write(p []byte) (int, error) { return len(p), nil }
func (discardWriter) WriteHeader(int)             {}
