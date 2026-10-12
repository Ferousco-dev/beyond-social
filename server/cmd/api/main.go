package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/config"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/database"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/handoff"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	httpserver "github.com/Ferousco-dev/beyond-social/server/internal/http"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/Ferousco-dev/beyond-social/server/internal/providers"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
	"github.com/Ferousco-dev/beyond-social/server/internal/worker"
	"github.com/Ferousco-dev/beyond-social/server/migrations"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server exited", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.LoadFromEnv()
	if err != nil {
		return err
	}
	slog.SetDefault(newLogger(cfg))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := database.ApplyMigrations(ctx, pool, migrations.FS); err != nil {
		return err
	}

	hub := realtime.NewHub()
	var alertSender alerts.Sender
	if cfg.AlertWebhookURL != "" {
		alertSender = alerts.NewWebhook(cfg.AlertWebhookURL)
	}
	alertService := alerts.NewService(database.NewAlertStore(pool), alertSender)

	creditStore := database.NewCreditStore(pool)
	creditService := credits.NewService(creditStore)
	searchBiller := credits.NewDiscoveryBiller(creditService)
	jobBiller := credits.NewJobBiller(creditService)
	jobService := jobs.NewService(database.NewJobStore(pool), hub).WithBiller(jobBiller)
	discoveryStore := database.NewDiscoveryStore(pool)
	discoveryService := discovery.NewService(discoveryStore, hub).WithBiller(searchBiller)

	var sealer *secrets.Sealer
	if cfg.AppEncryptionKey != "" {
		if sealer, err = secrets.NewSealer(cfg.AppEncryptionKey); err != nil {
			return err
		}
	}
	vault := secrets.NewVault(database.NewSecretStore(pool), sealer, map[string]string{
		secrets.NameApify:         cfg.APIFYToken,
		secrets.NameKIE:           cfg.KIEAPIKey,
		secrets.NameKIEWebhook:    cfg.KIEWebhookHMACKey,
		secrets.NameHeygen:        cfg.HeygenAPIKey,
		secrets.NameHeygenWebhook: cfg.HeygenWebhookSecret,
		secrets.NameGemini:        cfg.GeminiAPIKey,
	})

	apifyClient := apify.NewClientWithKey(vault.Key(secrets.NameApify))
	actors := apify.Actors{TikTok: cfg.APIFYTikTokActor, Instagram: cfg.APIFYInstagramActor}
	discoveryProcessor := discovery.NewProcessor(discoveryStore, apifyClient, actors, hub).WithAlerts(alertService).WithBiller(searchBiller)
	transformProcessor := &transform.Processor{
		Alerts:      alertService,
		Jobs:        jobService,
		Provider:    kie.NewClientWithKey(vault.Key(secrets.NameKIE)),
		Fetcher:     safenet.NewFetcher(45 * time.Second),
		Resolver:    transform.ApifyResolver{API: apifyClient, Actors: actors},
		CallbackURL: cfg.KIECallbackURL(),
	}

	heygenClient := heygen.NewClientWithKey(vault.Key(secrets.NameHeygen))
	footage := storage.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	voiceService := voices.NewService(database.NewVoiceRecords(pool), heygenClient)
	avatarStore := database.NewAvatarStore(pool)
	avatarService := avatars.NewService(avatarStore, footage, heygenClient, hub, cfg.AllowedOrigins).WithVoices(voiceService)
	avatarProcessor := &avatars.Processor{Service: avatarService, Repo: avatarStore, Alerts: alertService}
	videoProcessor := &avatarvideo.Processor{
		Alerts: alertService,
		Jobs:   jobService, Avatars: avatarService, Provider: heygenClient, CallbackURL: cfg.HeygenCallbackURL(),
	}

	geminiClient, err := gemini.NewClient(gemini.Config{KeyFunc: vault.Key(secrets.NameGemini), Model: cfg.GeminiModel})
	if err != nil {
		return err
	}
	registry := orchestrator.DefaultRegistry()
	planner := orchestrator.NewPlanner(geminiClient, registry)
	orchestratorService, err := orchestrator.NewService(orchestrator.Deps{
		Store:     database.NewWorkflowStore(pool),
		Planner:   planner,
		Registry:  registry,
		Discovery: discoveryService,
		Transform: transform.NewService(jobService, discoveryService),
		AvatarVid: avatarvideo.NewService(jobService, avatarService, voiceService),
		Jobs:      jobService,
		Publisher: hub,
		Credits:   orchestrator.NewApprovalGate(registry),
		Alerts:    alertService,
	})
	if err != nil {
		return err
	}

	app := httpserver.NewApp(httpserver.Deps{
		Accounts:            accounts.NewService(database.NewProfileStore(pool)).WithGranter(creditService),
		Credits:             creditService,
		CreditAdmin:         credits.NewAdmin(database.NewAdminCreditStore(creditStore)),
		CreditLedger:        creditService,
		Probe:               providers.NewChecker(),
		Avatars:             avatarService,
		Handoff:             handoff.NewService(database.NewHandoffStore(pool), avatarService),
		Voices:              voiceService,
		Alerts:              alertService,
		AvatarVideo:         avatarvideo.NewService(jobService, avatarService, voiceService),
		Videos:              videoProcessor,
		VideoReconciler:     videoProcessor,
		HeygenWebhookSecret: vault.Optional(secrets.NameHeygenWebhook),
		Vault:               vault,
		Audit:               database.NewAuditStore(pool),
		Jobs:                jobService,
		Discovery:           discoveryService,
		Transform:           transform.NewService(jobService, discoveryService),
		Reconciler:          transformProcessor,
		WebhookHMACKey:      vault.Optional(secrets.NameKIEWebhook),
		Workflows:           orchestratorService,
		Verifier: auth.NewVerifier(auth.Options{
			Issuer:      cfg.Issuer(),
			JWKSURL:     cfg.JWKSURL(),
			HS256Secret: cfg.SupabaseJWTSecret,
		}),
		Database:       pool,
		Hub:            hub,
		AllowedOrigins: cfg.AllowedOrigins,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           app.Handler(),
		ReadHeaderTimeout: 3 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	sweeper := &credits.Sweeper{Open: creditStore, Jobs: jobBiller, Searches: searchBiller}
	monitor := &providers.Monitor{
		Checker: providers.NewChecker(), Key: vault.Key, Alerts: alertService,
		Threshold: func(ctx context.Context, key string) (int, bool, error) { return creditStore.Setting(ctx, key) },
	}
	go sweeper.Run(ctx)
	go monitor.Run(ctx)

	workers := make(chan struct{})
	go func() {
		defer close(workers)
		worker.Run(ctx, 2*time.Second,
			&worker.Pool[discovery.Discovery]{
				Name: "discovery", Capacity: 3, Timeout: 2 * time.Minute,
				Claim: func(ctx context.Context, n int) ([]discovery.Discovery, error) {
					return discoveryStore.Claim(ctx, n, discovery.Lease)
				},
				Handle: discoveryProcessor.Handle,
			},
			&worker.Pool[jobs.Job]{
				Name: "video_transform", Capacity: 4, Timeout: transform.HandleTimeout,
				Claim: func(ctx context.Context, n int) ([]jobs.Job, error) {
					return jobService.Claim(ctx, transform.JobType, n, transform.Lease)
				},
				Handle: transformProcessor.Handle,
			},
			&worker.Pool[avatars.Avatar]{
				Name: "avatars", Capacity: 3, Timeout: time.Minute,
				Claim: func(ctx context.Context, n int) ([]avatars.Avatar, error) {
					return avatarStore.Claim(ctx, n, avatars.Lease)
				},
				Handle: avatarProcessor.Handle,
			},
			&worker.Pool[jobs.Job]{
				Name: "avatar_video", Capacity: 4, Timeout: avatarvideo.HandleTimeout,
				Claim: func(ctx context.Context, n int) ([]jobs.Job, error) {
					return jobService.Claim(ctx, avatarvideo.JobType, n, avatarvideo.Lease)
				},
				Handle: videoProcessor.Handle,
			},
			&worker.Pool[orchestrator.Workflow]{
				Name: "workflows", Capacity: 4, Timeout: orchestrator.EngineTimeout,
				Claim: func(ctx context.Context, n int) ([]orchestrator.Workflow, error) {
					return orchestratorService.ClaimWorkflows(ctx, n)
				},
				Handle: orchestratorService.HandleWorkflow,
			},
		)
	}()

	serveErr := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", srv.Addr, "env", cfg.Environment)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	// Hijacked WebSocket connections are invisible to srv.Shutdown, so the hub
	// closes them itself.
	hub.Close(shutdownCtx)
	select {
	case <-workers:
	case <-shutdownCtx.Done():
		slog.Warn("background work did not finish before the shutdown deadline; leases will expire and it will resume")
	}
	if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	slog.Info("server stopped cleanly")
	return nil
}

func newLogger(cfg config.Config) *slog.Logger {
	var level slog.Level
	if err := level.UnmarshalText([]byte(cfg.LogLevel)); err != nil {
		level = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
}
