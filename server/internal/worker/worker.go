// Package worker runs durable background work. Work lives in Postgres rows
// that are leased when claimed, so a restart or crash loses nothing: expired
// leases simply make the rows due again.
package worker

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"
)

// Pool claims items of type T and handles each in its own goroutine, never
// running more than Capacity at once.
type Pool[T any] struct {
	Name     string
	Capacity int
	// Timeout bounds one Handle call so a stuck provider cannot hold a slot forever.
	Timeout time.Duration
	Claim   func(ctx context.Context, n int) ([]T, error)
	Handle  func(ctx context.Context, item T)

	inflight atomic.Int32
	wg       sync.WaitGroup
}

func (p *Pool[T]) tick(ctx context.Context) {
	free := p.Capacity - int(p.inflight.Load())
	if free <= 0 {
		return
	}
	items, err := p.Claim(ctx, free)
	if err != nil {
		if ctx.Err() == nil {
			slog.Error("claim work", "pool", p.Name, "error", err)
		}
		return
	}
	for _, item := range items {
		p.inflight.Add(1)
		p.wg.Add(1)
		go func() {
			defer p.wg.Done()
			defer p.inflight.Add(-1)
			defer func() {
				if r := recover(); r != nil {
					slog.Error("worker panic", "pool", p.Name, "panic", r)
				}
			}()
			hctx, cancel := context.WithTimeout(ctx, p.Timeout)
			defer cancel()
			p.Handle(hctx, item)
		}()
	}
}

type Ticker interface {
	tick(ctx context.Context)
	wait()
}

func (p *Pool[T]) wait() { p.wg.Wait() }

// Run polls every interval until ctx is cancelled, then waits for in-flight work.
func Run(ctx context.Context, interval time.Duration, pools ...Ticker) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		for _, p := range pools {
			p.tick(ctx)
		}
		select {
		case <-ctx.Done():
			for _, p := range pools {
				p.wait()
			}
			return
		case <-t.C:
		}
	}
}
