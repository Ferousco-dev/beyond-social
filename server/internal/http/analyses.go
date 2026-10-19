package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

// AnalysisStarter queues video analyses. *analysis.Service satisfies it.
type AnalysisStarter interface {
	Queue(ctx context.Context, userID string, req analysis.Request, key string) (jobs.Job, bool, error)
	StartFetch(ctx context.Context, userID, raw, key string) (jobs.Job, bool, error)
}

// analysisRequest names the video by link or by a stored file, which is what a
// previewed link becomes, and may carry the person's own notes.
type analysisRequest struct {
	URL     string `json:"url"`
	MediaID string `json:"media_id"`
	Notes   string `json:"notes"`
}

// submitAnalysis queues an analysis of one TikTok, Instagram, or YouTube link
// and returns at once; the result arrives on the job record.
func (a *App) submitAnalysis(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req analysisRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	queued := analysis.Request{Notes: req.Notes}
	if req.MediaID != "" {
		if _, err := uuid.Parse(req.MediaID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", "unknown video")
			return
		}
		queued.MediaID = req.MediaID
	} else {
		link, valid := analysis.ParseLink(req.URL)
		if !valid {
			writeError(w, http.StatusBadRequest, "invalid_request", "send a TikTok, Instagram, or YouTube video link")
			return
		}
		queued.Link = link
	}
	job, isNew, err := a.deps.Analyses.Queue(r.Context(), identity.UserID, queued, r.Header.Get("Idempotency-Key"))
	a.writeAnalysisJob(w, r, job, isNew, err)
}

// submitAnalysisPreview queues the download of a linked video so it can be
// watched before it is analysed. It is free: only the analysis is charged.
func (a *App) submitAnalysisPreview(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req analysisRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	job, isNew, err := a.deps.Analyses.StartFetch(r.Context(), identity.UserID, req.URL, r.Header.Get("Idempotency-Key"))
	a.writeAnalysisJob(w, r, job, isNew, err)
}

func (a *App) writeAnalysisJob(w http.ResponseWriter, r *http.Request, job jobs.Job, isNew bool, err error) {
	switch {
	case errors.Is(err, analysis.ErrBadLink):
		writeError(w, http.StatusBadRequest, "invalid_request", "send a TikTok, Instagram, or YouTube video link")
	case errors.Is(err, analysis.ErrNotesTooLong):
		writeError(w, http.StatusBadRequest, "invalid_request", "notes are too long")
	case errors.Is(err, analysis.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "too many analyses in progress; wait for one to finish")
	case writeCreditError(w, err):
	case err != nil:
		writeInternal(w, r, err)
	case isNew:
		writeData(w, http.StatusAccepted, job)
	default:
		writeData(w, http.StatusOK, job)
	}
}
