package alerts

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Report calls r.Report when a reporter is configured, so callers need no nil checks.
func Report(ctx context.Context, r Reporter, err error, c Context) provider.Class {
	if r == nil {
		return provider.Classify(err)
	}
	return r.Report(ctx, err, c)
}
