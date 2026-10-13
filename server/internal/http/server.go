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
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/Ferousco-dev/beyond-social/server/internal/handoff"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/library"
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
	StripeWebhookSecret func(ctx context.Context) string
	Vault               CredentialVault
	Credits             CreditReader
	Chat                ChatService
	Media               MediaService
	Social              SocialService
	Posts               PostService
	Library             library.Store
	Editor              editor.Store
	Assistant           editor.Assistant
	Memory              MemoryService
	AssistBiller        ResourceBiller
	Transcriber         editor.Transcriber
	CaptionBiller       ResourceBiller
	Watcher             editor.Watcher
	Models              ModelAdmin
	Billing             BillingService
	Usage               UsageService
	BillingAdmin        billing.AdminReader
	EmailSettings       EmailSettings
	SignIns             accounts.SignInRemover
	Purger              interface {
		Purge(ctx context.Context, userID string) error
	}
	WatchBiller ResourceBiller
	Scenes      SceneService
	// AppURL is the web app the sign-in redirects back into.
	AppURL string
	// PublicBaseURL is this service's own address, reported by the admin setup check.
	PublicBaseURL  string
	CreditAdmin    CreditAdmin
	CreditLedger   CreditLedger
	Probe          CredentialProbe
	Audit          Auditor
	Verifier       *auth.Verifier
	Database       Pinger
	Hub            *realtime.Hub
	AllowedOrigins []string
}

type App struct {
	deps   Deps
	limits *limiter
}

func NewApp(deps Deps) *App { return &App{deps: deps, limits: newLimiter()} }

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
	mux.HandleFunc("POST /api/v1/callbacks/stripe", a.stripeCallback)
	mux.HandleFunc("GET /api/v1/packs", a.listPacks)
	mux.HandleFunc("GET /api/v1/plans", a.plans)

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
	protected := func(h http.Handler) http.Handler { return authenticated(a.limitPerUser(a.requireActiveAccount(h))) }
	mux.Handle("GET /api/v1/me", protected(http.HandlerFunc(a.me)))
	mux.Handle("GET /api/v1/jobs", protected(http.HandlerFunc(a.listJobs)))
	mux.Handle("GET /api/v1/jobs/{id}", protected(http.HandlerFunc(a.getJob)))
	mux.Handle("POST /api/v1/jobs/video-transform", protected(http.HandlerFunc(a.createTransform)))
	mux.Handle("GET /api/v1/admin/alerts", protected(a.requireAdmin(a.listAlerts)))
	mux.Handle("POST /api/v1/admin/alerts/{id}/resolve", protected(a.requireAdmin(a.resolveAlert)))
	mux.Handle("PUT /api/v1/conversations/{id}/editor", protected(http.HandlerFunc(a.conversationEditor)))
	mux.Handle("POST /api/v1/editor/watch", protected(http.HandlerFunc(a.editorWatch)))
	mux.Handle("POST /api/v1/editor/scenes", protected(http.HandlerFunc(a.createScene)))
	mux.Handle("GET /api/v1/editor/scenes/quote", protected(http.HandlerFunc(a.sceneQuote)))
	mux.Handle("POST /api/v1/editor/transcribe", protected(http.HandlerFunc(a.editorTranscribe)))
	mux.Handle("POST /api/v1/editor/assist", protected(http.HandlerFunc(a.editorAssist)))
	mux.Handle("GET /api/v1/memory", protected(http.HandlerFunc(a.memorySettings)))
	mux.Handle("POST /api/v1/memory", protected(http.HandlerFunc(a.addMemory)))
	mux.Handle("DELETE /api/v1/memory/{id}", protected(http.HandlerFunc(a.deleteMemory)))
	mux.Handle("PUT /api/v1/memory/enabled", protected(http.HandlerFunc(a.setMemoryEnabled)))
	mux.Handle("GET /api/v1/editor/projects", protected(http.HandlerFunc(a.listEditorProjects)))
	mux.Handle("POST /api/v1/editor/projects", protected(http.HandlerFunc(a.createEditorProject)))
	mux.Handle("GET /api/v1/editor/projects/{id}", protected(http.HandlerFunc(a.getEditorProject)))
	mux.Handle("PUT /api/v1/editor/projects/{id}", protected(http.HandlerFunc(a.saveEditorProject)))
	mux.Handle("DELETE /api/v1/editor/projects/{id}", protected(http.HandlerFunc(a.deleteEditorProject)))
	mux.Handle("GET /api/v1/library", protected(http.HandlerFunc(a.listLibrary)))
	mux.Handle("POST /api/v1/library/{id}/adopt", protected(http.HandlerFunc(a.adoptLibraryVideo)))
	mux.Handle("DELETE /api/v1/library/{id}", protected(http.HandlerFunc(a.deleteLibraryVideo)))
	mux.Handle("GET /api/v1/posts", protected(http.HandlerFunc(a.listPosts)))
	mux.Handle("POST /api/v1/posts", protected(http.HandlerFunc(a.createPost)))
	mux.Handle("POST /api/v1/posts/{id}/cancel", protected(http.HandlerFunc(a.cancelPost)))
	mux.Handle("GET /api/v1/social", protected(http.HandlerFunc(a.listSocial)))
	mux.Handle("POST /api/v1/social/{platform}/connect", protected(http.HandlerFunc(a.connectSocial)))
	mux.Handle("DELETE /api/v1/social/{platform}", protected(http.HandlerFunc(a.disconnectSocial)))
	mux.Handle("GET /api/v1/social/callback/{platform}", http.HandlerFunc(a.socialCallback))
	mux.Handle("POST /api/v1/media", protected(http.HandlerFunc(a.requestMediaUpload)))
	mux.Handle("POST /api/v1/media/{id}/confirm", protected(http.HandlerFunc(a.confirmMedia)))
	mux.Handle("GET /api/v1/media/{id}/url", protected(http.HandlerFunc(a.mediaViewURL)))
	mux.Handle("POST /api/v1/conversations", protected(http.HandlerFunc(a.createConversation)))
	mux.Handle("GET /api/v1/conversations", protected(http.HandlerFunc(a.listConversations)))
	mux.Handle("GET /api/v1/conversations/{id}", protected(http.HandlerFunc(a.getConversation)))
	mux.Handle("DELETE /api/v1/conversations/{id}", protected(http.HandlerFunc(a.archiveConversation)))
	mux.Handle("POST /api/v1/conversations/{id}/messages", protected(http.HandlerFunc(a.sendMessage)))
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
	mux.Handle("PATCH /api/v1/me", protected(http.HandlerFunc(a.renameMe)))
	mux.Handle("DELETE /api/v1/me", protected(http.HandlerFunc(a.deleteMe)))
	mux.Handle("GET /api/v1/usage", protected(http.HandlerFunc(a.myUsage)))
	mux.Handle("PUT /api/v1/usage/overage", protected(http.HandlerFunc(a.setOverage)))
	mux.Handle("POST /api/v1/subscription/checkout", protected(http.HandlerFunc(a.subscribe)))
	mux.Handle("POST /api/v1/subscription/portal", protected(http.HandlerFunc(a.billingPortal)))
	mux.Handle("POST /api/v1/credits/checkout", protected(http.HandlerFunc(a.checkout)))
	mux.Handle("GET /api/v1/credits/payments", protected(http.HandlerFunc(a.myPayments)))
	mux.Handle("GET /api/v1/admin/packs", protected(a.requireAdmin(a.adminPacks)))
	mux.Handle("POST /api/v1/admin/packs", protected(a.requireAdmin(a.savePack)))
	mux.Handle("PUT /api/v1/admin/packs/{id}", protected(a.requireAdmin(a.savePack)))
	mux.Handle("DELETE /api/v1/admin/packs/{id}", protected(a.requireAdmin(a.deletePack)))
	mux.Handle("GET /api/v1/admin/models", protected(a.requireAdmin(a.listModels)))
	mux.Handle("PUT /api/v1/admin/models/{role}", protected(a.requireAdmin(a.chooseModel)))
	mux.Handle("GET /api/v1/admin/billing", protected(a.requireAdmin(a.billingOverview)))
	mux.Handle("GET /api/v1/admin/email", protected(a.requireAdmin(a.getEmailFrom)))
	mux.Handle("PUT /api/v1/admin/email", protected(a.requireAdmin(a.setEmailFrom)))
	mux.Handle("GET /api/v1/admin/setup", protected(a.requireAdmin(a.setup)))
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
	mux.Handle("GET /api/v1/workflows/{id}", protected(http.HandlerFunc(a.getWorkflow)))
	mux.Handle("POST /api/v1/workflows/{id}/approve", protected(http.HandlerFunc(a.approveWorkflow)))
	mux.Handle("POST /api/v1/workflows/{id}/start", protected(http.HandlerFunc(a.startWorkflow)))
	mux.Handle("POST /api/v1/workflows/{id}/cancel", protected(http.HandlerFunc(a.cancelWorkflow)))

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
