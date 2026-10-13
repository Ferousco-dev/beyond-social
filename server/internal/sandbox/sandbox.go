package sandbox

import (
	_ "embed"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
)

//go:embed assets/clip.mp4
var clipMP4 []byte

//go:embed assets/frame.png
var framePNG []byte

// Server answers as the outside services would. Everything is kept in memory
// and forgotten on restart.
type Server struct {
	// Base is where this server is reached (https://127.0.0.1:8443). Links it
	// hands out, such as a video address, are built from it.
	Base string
	// APIBase is the product's own API, which payment events are sent to.
	APIBase string
	// WebhookSecret signs the payment events the sandbox sends.
	WebhookSecret string

	mu      sync.Mutex
	polls   map[string]int
	avatars map[string]*avatar
	pay     map[string]checkout
	Emails  []string
}

func New(base, apiBase, webhookSecret string) *Server {
	return &Server{
		Base: strings.TrimRight(base, "/"), APIBase: strings.TrimRight(apiBase, "/"), WebhookSecret: webhookSecret,
		polls: map[string]int{}, avatars: map[string]*avatar{}, pay: map[string]checkout{},
	}
}

// Handler serves every fake provider under its own path prefix.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	s.mountVideo(mux)
	s.mountAvatars(mux)
	s.mountApify(mux)
	s.mountPayments(mux)
	s.mountSocial(mux)
	s.mountModels(mux)
	mux.HandleFunc("GET /files/clip.mp4", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "video/mp4")
		http.ServeContent(w, r, "clip.mp4", startTime, bytesReader(clipMP4))
	})
	mux.HandleFunc("GET /files/frame.png", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(framePNG)
	})
	// What the admin console's "test this key" buttons ask. Any key passes.
	mux.HandleFunc("GET /apify/users/me", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"username": "sandbox"}})
	})
	mux.HandleFunc("GET /heygen/users/me", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"wallet": map[string]any{"remaining_balance": 500}}})
	})
	mux.HandleFunc("GET /stripe/balance", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"object": "balance"})
	})
	mux.HandleFunc("GET /openrouter/auth/key", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"label": "sandbox"}})
	})
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "sandbox"})
	})
	return mux
}

// poll counts how many times something was asked about, so a job can look
// busy for a moment and then finish.
func (s *Server) poll(key string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.polls[key]++
	return s.polls[key]
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func notFound(w http.ResponseWriter) {
	writeJSON(w, http.StatusNotFound, map[string]any{"error": map[string]string{"code": "not_found", "message": "not found in the sandbox"}})
}
