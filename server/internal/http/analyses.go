package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// AnalysisStarter queues video analyses. *analysis.Service satisfies it.
type AnalysisStarter interface {
	Start(ctx context.Context, userID string, link analysis.Link, conversationID, key string) (jobs.Job, bool, error)
}

type analysisRequest struct {
	URL string `json:"url"`
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
	link, valid := analysis.ParseLink(req.URL)
	if !valid {
		writeError(w, http.StatusBadRequest, "invalid_request", "send a TikTok, Instagram, or YouTube video link")
		return
	}
	job, isNew, err := a.deps.Analyses.Start(r.Context(), identity.UserID, link, "", r.Header.Get("Idempotency-Key"))
	switch {
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
