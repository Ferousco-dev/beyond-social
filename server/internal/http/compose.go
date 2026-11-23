package httpserver

import (
	"context"
	"errors"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/videoedit"
)

// ComposeService is the New Video composer: a suggested rewrite of the person's
// prompt, and edits of their own video.
type ComposeService interface {
	Rewrite(ctx context.Context, userID string, req videoedit.RewriteRequest) (string, error)
	Measure(ctx context.Context, userID, videoID string) (float64, error)
	Submit(ctx context.Context, userID string, r videoedit.Request, key string) (jobs.Job, bool, error)
	// EditRate is the credits one second of an edit costs.
	EditRate(ctx context.Context) (int, error)
}

// Each rewrite is a model call that costs us and not the person, so it has its
// own cap on top of the general request limit.
const rewritesPerHour = 30

type rewriteGate struct {
	mu   sync.Mutex
	used map[string][]time.Time
	now  func() time.Time
}

func newRewriteGate() *rewriteGate {
	return &rewriteGate{used: map[string][]time.Time{}, now: time.Now}
}

// allow spends one rewrite, or says how long until one is free.
func (g *rewriteGate) allow(userID string) (bool, time.Duration) {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := g.now()
	if len(g.used) > 10_000 {
		for k, times := range g.used {
			if len(within(times, now, time.Hour)) == 0 {
				delete(g.used, k)
			}
		}
	}
	times := within(g.used[userID], now, time.Hour)
	if len(times) >= rewritesPerHour {
		g.used[userID] = times
		return false, time.Hour - now.Sub(times[0])
	}
	g.used[userID] = append(times, now)
	return true, 0
}

func (a *App) composeRewrite(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	if a.deps.Compose == nil {
		writeError(w, http.StatusServiceUnavailable, "unavailable", "prompt suggestions are not available right now")
		return
	}
	var req struct {
		Mode         string   `json:"mode"`
		Prompt       string   `json:"prompt"`
		PictureIDs   []string `json:"picture_media_ids"`
		VideoMediaID string   `json:"video_media_id"`
	}
	if !decodeJSONLimit(w, r, &req, 16<<10) {
		return
	}
	if allowed, wait := a.rewrites.allow(identity.UserID); !allowed {
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have asked for many suggestions this hour; use your own prompt or try again later")
		return
	}
	rr := videoedit.RewriteRequest{Mode: videoedit.Mode(req.Mode), Prompt: req.Prompt, PictureMediaIDs: req.PictureIDs}
	if req.VideoMediaID != "" {
		seconds, err := a.deps.Compose.Measure(r.Context(), identity.UserID, req.VideoMediaID)
		if err == nil || errors.Is(err, videoedit.ErrLength) {
			rr.VideoSeconds = seconds
		}
	}
	suggestion, err := a.deps.Compose.Rewrite(r.Context(), identity.UserID, rr)
	if writeComposeError(w, r, err) {
		return
	}
	writeData(w, http.StatusOK, map[string]string{"prompt": suggestion})
}

// composeEditQuote measures the person's video and prices editing it, so the
// credits shown are the credits charged.
func (a *App) composeEditQuote(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	if a.deps.Compose == nil {
		writeError(w, http.StatusServiceUnavailable, "unavailable", "video editing is not available right now")
		return
	}
	seconds, err := a.deps.Compose.Measure(r.Context(), identity.UserID, r.URL.Query().Get("video_media_id"))
	if writeComposeError(w, r, err) {
		return
	}
	rate, err := a.deps.Compose.EditRate(r.Context())
	if err != nil {
		if !writeCreditError(w, err) {
			writeInternal(w, r, err)
		}
		return
	}
	billed := videoedit.Request{Seconds: seconds}.BilledSeconds()
	price, err := a.priceFor(r.Context(), identity.UserID, rate*billed)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{"credits": price, "seconds": billed})
}

func (a *App) composeEdit(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	if a.deps.Compose == nil {
		writeError(w, http.StatusServiceUnavailable, "unavailable", "video editing is not available right now")
		return
	}
	var req struct {
		VideoMediaID string   `json:"video_media_id"`
		PictureIDs   []string `json:"picture_media_ids"`
		Prompt       string   `json:"prompt"`
		AspectRatio  string   `json:"aspect_ratio"`
	}
	if !decodeJSONLimit(w, r, &req, 16<<10) {
		return
	}
	job, isNew, err := a.deps.Compose.Submit(r.Context(), identity.UserID, videoedit.Request{
		VideoMediaID: req.VideoMediaID, PictureMediaIDs: req.PictureIDs, Prompt: req.Prompt, AspectRatio: req.AspectRatio,
	}, r.Header.Get("Idempotency-Key"))
	switch {
	case errors.Is(err, videoedit.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many edits in progress; wait for one to finish")
	case writeCreditError(w, err):
	case writeComposeError(w, r, err):
	case isNew:
		writeData(w, http.StatusAccepted, job)
	default:
		writeData(w, http.StatusOK, job)
	}
}

// writeComposeError answers for the errors the composer shares, and reports
// whether it wrote a response.
func writeComposeError(w http.ResponseWriter, r *http.Request, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, videoedit.ErrInvalid), errors.Is(err, videoedit.ErrLength):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, media.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "that file was not found; attach it again")
	case errors.Is(err, media.ErrNotUploaded):
		writeError(w, http.StatusBadRequest, "invalid_request", "that file has not finished uploading")
	case errors.Is(err, media.ErrUnsupported), errors.Is(err, media.ErrCannotMeasure):
		writeError(w, http.StatusBadRequest, "unsupported_file", "use an MP4 or MOV video and JPG or PNG pictures")
	case errors.Is(err, media.ErrTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "request_too_large", "that file is too large")
	case errors.Is(err, videoedit.ErrRewrite):
		writeError(w, http.StatusBadGateway, "rewrite_failed", "a suggestion could not be written; use your own prompt or try again")
	default:
		writeInternal(w, r, err)
	}
	return true
}
