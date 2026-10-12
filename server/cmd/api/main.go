package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/config"
	"github.com/Ferousco-dev/beyond-social/server/internal/database"
	httpserver "github.com/Ferousco-dev/beyond-social/server/internal/http"
)

func main() {
	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	if err := database.ApplyMigrations(ctx, pool, "migrations"); err != nil {
		log.Fatalf("database migration failed: %v", err)
	}

	jobStore := database.NewJobStore(pool)
	app := httpserver.NewApp(cfg, jobStore)
	srv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           app.Handler(),
		ReadHeaderTimeout: 3 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("server listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("http server error: %v", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
	log.Println("server stopped cleanly")
}
