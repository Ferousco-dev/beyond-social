package discovery

import (
	"context"
	"errors"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// Lease keeps a claimed discovery from being picked up again mid-step.
const Lease = 45 * time.Second

const (
	maxAge         = 5 * time.Minute
	maxAttempts    = 4
	pollWait       = 20 // seconds Apify may hold a status request
	maxChargeUSD   = 0.50
	runTimeoutSecs = 240
	msgFailed      = "The search could not be completed. Please try again."
	msgTimedOut    = "The search took too long. Try a narrower search."
	msgUnavailable = "Search is temporarily unavailable. Please try again shortly."
)

type Processor struct {
	repo      Repository
	scraper   apify.API
	actors    apify.Actors
	publisher realtime.Publisher
	alerts    alerts.Reporter
	biller    Biller
	now       func() time.Time
}

func NewProcessor(repo Repository, scraper apify.API, actors apify.Actors, publisher realtime.Publisher) *Processor {
	return &Processor{repo: repo, scraper: scraper, actors: actors, publisher: publisher, now: time.Now}
}

// Handle advances one claimed discovery by a single step. Every step is safe to
// repeat: the run ID is saved as soon as the run exists, so after a restart the
// same run is polled rather than a second, paid one started.
func (p *Processor) Handle(ctx context.Context, d Discovery) {
	if err := p.step(ctx, d); err != nil {
		p.handleError(ctx, d, err)
	}
}

func (p *Processor) step(ctx context.Context, d Discovery) error {
	if p.now().Sub(d.CreatedAt) > maxAge {
		p.fail(ctx, d, msgTimedOut)
		return nil
	}
	if d.ApifyRunID == "" {
		return p.start(ctx, d)
	}
	run, err := p.scraper.GetRun(ctx, d.ApifyRunID, pollWait)
	if err != nil {
		return err
	}
	if !run.Finished() {
		return p.reschedule(ctx, d, 1*time.Second)
	}
	if run.Status != apify.StatusSucceeded {
		slog.Warn("apify run did not succeed", "discovery_id", d.ID, "status", run.Status)
		p.fail(ctx, d, msgFailed)
		return nil
	}
	return p.finish(ctx, d, run)
}

func (p *Processor) start(ctx context.Context, d Discovery) error {
	criteria := apify.Criteria{Platform: d.Platform, Limit: d.RequestedLimit}
	if d.Kind == KindURL {
		criteria.URL = d.Query
	} else {
		criteria.Query = d.Query
	}
	run, err := p.scraper.StartRun(ctx, p.actors.For(d.Platform), apify.BuildInput(criteria), apify.RunOptions{
		MaxItems: d.RequestedLimit, MaxChargeUSD: maxChargeUSD, TimeoutSeconds: runTimeoutSecs,
	})
	if err != nil {
		return err
	}
	next := p.now()
	updated, err := p.repo.Advance(ctx, d.ID, Update{Status: StatusRunning, RunID: &run.ID, NextRun: &next})
	if err != nil {
		return err
	}
	publish(p.publisher, updated)
	return nil
}

func (p *Processor) finish(ctx context.Context, d Discovery, run apify.Run) error {
	rows, err := p.scraper.Items(ctx, run.DefaultDatasetID, d.RequestedLimit)
	if err != nil {
		return err
	}
	videos, err := apify.Normalize(d.Platform, rows, p.now().UTC())
	if err != nil {
		slog.Error("apify output did not match the expected shape", "discovery_id", d.ID, "platform", d.Platform, "error", err)
		p.fail(ctx, d, msgFailed)
		return nil
	}
	for i := range videos {
		videos[i].DiscoveredAt = p.now().UTC()
	}
	done, err := p.repo.Complete(ctx, d.ID, videos)
	if errors.Is(err, ErrFinished) {
		return nil
	}
	if err != nil {
		return err
	}
	p.closeCharge(ctx, d, true)
	publish(p.publisher, done)
	return nil
}

func (p *Processor) reschedule(ctx context.Context, d Discovery, after time.Duration) error {
	next := p.now().Add(after)
	_, err := p.repo.Advance(ctx, d.ID, Update{NextRun: &next})
	return err
}

func (p *Processor) handleError(ctx context.Context, d Discovery, err error) {
	if ctx.Err() != nil {
		return // shutting down; the lease expires and the row is picked up again
	}
	alerts.Report(ctx, p.alerts, err, alerts.Context{Source: "discovery", UserID: d.UserID, Resource: d.ID})
	slog.Warn("discovery step failed", "discovery_id", d.ID, "attempt", d.RetryCount+1, "error", err)
	if !provider.IsTransient(err) {
		p.fail(ctx, d, msgFailed)
		return
	}
	if d.RetryCount+1 >= maxAttempts {
		p.fail(ctx, d, msgUnavailable)
		return
	}
	next := p.now().Add(backoff(d.RetryCount))
	if _, aerr := p.repo.Advance(ctx, d.ID, Update{RetryDelta: 1, NextRun: &next}); aerr != nil && !errors.Is(aerr, ErrFinished) {
		slog.Error("schedule discovery retry", "discovery_id", d.ID, "error", aerr)
	}
}

func (p *Processor) fail(ctx context.Context, d Discovery, message string) {
	// Detached from ctx so a failure is still recorded while shutting down.
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	updated, err := p.repo.Advance(saveCtx, d.ID, Update{Status: StatusFailed, Error: message})
	if err != nil {
		if !errors.Is(err, ErrFinished) {
			slog.Error("record discovery failure", "discovery_id", d.ID, "error", err)
		}
		return
	}
	p.closeCharge(ctx, d, false)
	publish(p.publisher, updated)
}

// closeCharge settles or refunds. A failure is logged, not returned: the search
// is already final and the sweeper closes anything missed.
func (p *Processor) closeCharge(ctx context.Context, d Discovery, delivered bool) {
	if p.biller == nil {
		return
	}
	closeCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := p.biller.Close(closeCtx, d.UserID, d.ID, delivered); err != nil {
		slog.Error("close search charge", "discovery_id", d.ID, "user_id", d.UserID, "error", err)
	}
}

func backoff(attempt int) time.Duration {
	return time.Duration(5<<attempt) * time.Second // 5s, 10s, 20s
}

// WithAlerts reports failures only an operator can fix (no credit, bad key).
func (p *Processor) WithAlerts(r alerts.Reporter) *Processor {
	p.alerts = r
	return p
}

// WithBiller closes the charge when a search finishes.
func (p *Processor) WithBiller(b Biller) *Processor {
	p.biller = b
	return p
}
