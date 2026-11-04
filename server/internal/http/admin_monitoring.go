package httpserver

import (
	"context"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/monitoring"
)

func (a *App) monitoringSnapshot(w http.ResponseWriter, r *http.Request) {
	snapshot, err := a.deps.Monitoring.Snapshot(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, snapshot)
}

type AdminMonitoring interface {
	Snapshot(ctx context.Context) (monitoring.Snapshot, error)
}
