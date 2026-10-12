package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/config"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/gorilla/websocket"
)

type JobRepository interface {
	ListJobs(ctx context.Context, userID string, limit, offset int) ([]jobs.Job, error)
	GetJob(ctx context.Context, userID, jobID string) (jobs.Job, error)
	Create(ctx context.Context, job jobs.Job) error
	Update(ctx context.Context, job jobs.Job) error
}

type App struct {
	cfg      config.Config
	jobs     JobRepository
	upgrader websocket.Upgrader
}

func NewApp(cfg config.Config, repository JobRepository) *App {
	return &App{
		cfg:  cfg,
		jobs: repository,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  4096,
			WriteBufferSize: 4096,
			CheckOrigin: func(r *http.Request) bool {
				if cfg.WebsocketOrigin == "*" {
					return true
				}
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				for _, allowed := range strings.Split(cfg.WebsocketOrigin, ",") {
					value := strings.TrimSpace(allowed)
					if value == origin {
						return true
					}
				}
				return false
			},
		},
	}
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", HealthHandler)
	mux.HandleFunc("/ready", ReadyHandler)

	api := http.NewServeMux()
	api.HandleFunc("/api/v1/me", a.meHandler)
	api.HandleFunc("/api/v1/jobs", a.jobsHandler)
	api.HandleFunc("/api/v1/jobs/", a.jobByIDHandler)
	api.HandleFunc("/ws", a.websocketHandler)
	mux.Handle("/api/v1/", auth.AuthMiddleware(api))
	mux.Handle("/ws", auth.AuthMiddleware(http.HandlerFunc(a.websocketHandler)))
	return mux
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func ReadyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ready", "checks": map[string]string{"database": "ok"}})
}

func (a *App) meHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "missing authenticated user", http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"user_id": userID})
}

func (a *App) jobsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "missing authenticated user", http.StatusUnauthorized)
		return
	}
	limit := 25
	if value := r.URL.Query().Get("limit"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "limit must be a positive integer"})
			return
		}
		limit = parsed
	}
	offset := 0
	if value := r.URL.Query().Get("offset"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "offset must be zero or greater"})
			return
		}
		offset = parsed
	}
	jobsList, err := a.jobs.ListJobs(r.Context(), userID, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobsList, "count": len(jobsList)})
}

func (a *App) jobByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "missing authenticated user", http.StatusUnauthorized)
		return
	}
	jobID := strings.TrimPrefix(r.URL.Path, "/api/v1/jobs/")
	if jobID == "" || strings.Contains(jobID, "/") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid job ID"})
		return
	}
	job, err := a.jobs.GetJob(r.Context(), userID, jobID)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || strings.Contains(err.Error(), "not found") {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "job not found"})
			return
		}
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "job is not owned by this user"})
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func (a *App) websocketHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "missing authenticated user", http.StatusUnauthorized)
		return
	}
	conn, err := a.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(4096)
	_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	defer conn.SetReadDeadline(time.Time{})
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
		event := map[string]any{
			"event":     "connection.ack",
			"version":   1,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"data": map[string]string{
				"user_id": userID,
				"status":  "connected",
			},
		}
		if err := conn.WriteJSON(event); err != nil {
			return
		}
		_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		fmt.Printf("json encode error: %v\n", err)
	}
}
