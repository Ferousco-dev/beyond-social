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
	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/config"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/database"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/handoff"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	httpserver "github.com/Ferousco-dev/beyond-social/server/internal/http"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/llm"
	"github.com/Ferousco-dev/beyond-social/server/internal/mailer"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
	"github.com/Ferousco-dev/beyond-social/server/internal/openrouter"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/Ferousco-dev/beyond-social/server/internal/providers"
	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/purge"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
	"github.com/Ferousco-dev/beyond-social/server/internal/supabaseauth"
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
	creditStore := database.NewCreditStore(pool)
	creditService := credits.NewService(creditStore).WithUsage(database.NewUsageStore(pool))
	entitlements := credits.NewEntitlements(creditService, database.NewEntitlementCounter(pool))
	searchBiller := credits.NewActionBiller(creditService, credits.ActionDiscoverySearch)
	avatarBiller := credits.NewActionBiller(creditService, credits.ActionAvatarTraining)
	jobBiller := credits.NewJobBiller(creditService)
	jobService := jobs.NewService(database.NewJobStore(pool), hub).WithBiller(jobBiller)
	discoveryStore := database.NewDiscoveryStore(pool)
	discoveryService := discovery.NewService(discoveryStore, hub).WithBiller(searchBiller).WithQuota(entitlements.SearchAllowance)

	var sealer *secrets.Sealer
	if cfg.AppEncryptionKey != "" {
		if sealer, err = secrets.NewSealer(cfg.AppEncryptionKey); err != nil {
			return err
		}
	}
	vaultEnv := map[string]string{
		secrets.NameApify:         cfg.APIFYToken,
		secrets.NameKIE:           cfg.KIEAPIKey,
		secrets.NameKIEWebhook:    cfg.KIEWebhookHMACKey,
		secrets.NameHeygen:        cfg.HeygenAPIKey,
		secrets.NameHeygenWebhook: cfg.HeygenWebhookSecret,
		secrets.NameGemini:        cfg.GeminiAPIKey,
		secrets.NameAlertWebhook:  cfg.AlertWebhookURL,
	}
	for name, value := range cfg.SocialApps {
		vaultEnv[name] = value
	}
	vault := secrets.NewVault(database.NewSecretStore(pool), sealer, vaultEnv)
	alertService := alerts.NewService(database.NewAlertStore(pool), alerts.NewWebhook(vault.Key(secrets.NameAlertWebhook)))

	apifyClient := apify.NewClientWithKey(vault.Key(secrets.NameApify))
	actors := apify.Actors{TikTok: cfg.APIFYTikTokActor, Instagram: cfg.APIFYInstagramActor}
	discoveryProcessor := discovery.NewProcessor(discoveryStore, apifyClient, actors, hub).WithAlerts(alertService).WithBiller(searchBiller)
	kieClient := kie.NewClientWithKey(vault.Key(secrets.NameKIE))
	transformProcessor := &transform.Processor{
		Alerts:      alertService,
		Jobs:        jobService,
		Provider:    kieClient,
		Fetcher:     safenet.NewFetcher(45 * time.Second),
		Resolver:    transform.ApifyResolver{API: apifyClient, Actors: actors},
		CallbackURL: cfg.KIECallbackURL(),
	}

	heygenClient := heygen.NewClientWithKey(vault.Key(secrets.NameHeygen))
	footage := storage.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	mediaService := media.NewService(database.NewMediaStore(pool), footage, transformProcessor.Fetcher)
	generateService := generate.NewService(jobService)
	transformProcessor.Builders = map[string]transform.Builder{
		generate.JobType: generate.Builder{Pictures: mediaService, Uploader: kieClient}.Build,
	}
	voiceService := voices.NewService(database.NewVoiceRecords(pool), heygenClient)
	avatarStore := database.NewAvatarStore(pool)
	avatarService := avatars.NewService(avatarStore, footage, heygenClient, hub, cfg.AllowedOrigins).WithVoices(voiceService).WithBiller(avatarBiller).WithQuota(entitlements.CheckAvatar)
	avatarProcessor := &avatars.Processor{Service: avatarService, Repo: avatarStore, Alerts: alertService}
	videoProcessor := &avatarvideo.Processor{
		Alerts: alertService,
		Jobs:   jobService, Avatars: avatarService, Provider: heygenClient, CallbackURL: cfg.HeygenCallbackURL(),
	}

	openRouterClient := openrouter.NewClient(openrouter.Config{KeyFunc: vault.Key(secrets.NameOpenRouter), Referer: cfg.AppURL()})
	geminiClient, err := gemini.NewClient(gemini.Config{KeyFunc: vault.Key(secrets.NameGemini), Model: cfg.GeminiModel})
	if err != nil {
		return err
	}
	profileStore := database.NewProfileStore(pool).WithAdminEmails(cfg.AdminEmails)
	settingsStore := database.NewSettingsStore(pool)
	emails := mailer.NewNotifier(mailer.NewResend(vault.Key(secrets.NameResend), func(ctx context.Context) string {
		from, _, _ := settingsStore.Get(ctx, httpserver.EmailFromKey)
		return from
	}), profileStore, cfg.AppURL())
	creditService.WithLimitNotifier(emails)
	billingStore := database.NewBillingStore(pool)
	billingService := billing.NewService(billingStore, creditService, billing.NewStripe(vault.Key(secrets.NameStripeKey)), cfg.AppURL()).
		WithPrices(creditService).WithNotifier(emails).WithTax(creditService.TaxEnabled)
	purger := purge.New(database.NewPurgeStore(pool), footage, avatarService, media.Bucket, avatars.FootageBucket)
	chatModel := llm.NewSwitch(llm.RoleChat, geminiClient, openRouterClient, settingsStore)
	editorModel := llm.NewSwitch(llm.RoleEditorAssistant, geminiClient, openRouterClient, settingsStore)
	registry := orchestrator.DefaultRegistry()
	planner := orchestrator.NewPlanner(geminiClient, registry)
	youtube, tiktok, instagram := social.NewYouTube(), social.NewTikTok(), social.NewInstagram()
	var socialSealer social.Sealer
	if sealer != nil {
		socialSealer = sealer
	}
	socialService := social.NewService(database.NewSocialStore(pool), socialSealer, vaultKeys(vault),
		func(p social.Platform) string { return cfg.SocialRedirectURL(string(p)) }, youtube, tiktok, instagram)
	postStore := database.NewPostStore(pool)
	postService := publish.NewService(postStore, jobService, socialService)
	orchestratorService, err := orchestrator.NewService(orchestrator.Deps{
		Store:     database.NewWorkflowStore(pool),
		Planner:   planner,
		Registry:  registry,
		Discovery: discoveryService,
		Transform: transform.NewService(jobService, discoveryService),
		AvatarVid: avatarvideo.NewService(jobService, avatarService, voiceService),
		Generate:  generateService,
		Posts:     postService,
		Jobs:      jobService,
		Publisher: hub,
		Credits:   orchestrator.NewApprovalGate(registry),
		Alerts:    alertService,
	})
	if err != nil {
		return err
	}

	analysisService := analysis.NewService(jobService)
	analysisProcessor := &analysis.Processor{
		Jobs: jobService, Watcher: geminiClient, Resolver: transformProcessor.Resolver,
		Fetcher: transformProcessor.Fetcher, Uploads: mediaService, Alerts: alertService,
	}

	workflowPlanner := chat.NewWorkflowPlanner(orchestratorService, registry)
	postProcessor := &publish.Processor{
		Store: postStore, Fetcher: transformProcessor.Fetcher, Vault: footage, Tokens: socialService,
		Publishers: map[social.Platform]social.Publisher{social.YouTube: youtube, social.TikTok: tiktok, social.Instagram: instagram}, Alerts: alertService,
	}
	memoryStore := database.NewMemoryStore(pool)
	memoryService := memory.NewService(memoryStore)
	chatService := chat.NewService(
		database.NewConversationStore(pool),
		chat.NewModelRouter(chatModel),
		workflowPlanner,
	).WithBilling(credits.NewActionBiller(creditService, credits.ActionChatMessage)).WithEvents(hub).WithAlerts(alertService).WithAnalyzer(analysisService).WithAttachments(mediaService).WithScriptWriter(chat.NewModelScriptWriter(chatModel)).WithScriptPlanner(workflowPlanner).WithMemory(memoryService).WithSummaries(memoryStore, chat.SummarizerFrom(memory.NewSummarizer(chatModel))).WithDailyLimit(func(ctx context.Context) (int, bool, error) {
		return creditStore.Setting(ctx, "daily_chat_limit")
	})
	jobService.WithObserver(chatService)

	app := httpserver.NewApp(httpserver.Deps{
		Chat:                chatService,
		Media:               mediaService,
		Social:              socialService,
		Posts:               postService,
		AppURL:              cfg.AppURL(),
		Accounts:            accounts.NewService(profileStore).WithGranter(creditService),
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
		PublicBaseURL:       cfg.PublicBaseURL,
		Library:             database.NewLibraryStore(pool),
		Editor:              database.NewEditorStore(pool),
		Assistant:           editor.NewModelAssistant(editorModel),
		Memory:              memoryService,
		AssistBiller:        credits.NewActionBiller(creditService, credits.ActionEditorAssist),
		Transcriber:         editor.NewModelTranscriber(geminiClient, transformProcessor.Fetcher),
		CaptionBiller:       credits.NewActionBiller(creditService, credits.ActionEditorCaptions),
		Billing:             billingService,
		Usage:               creditService,
		BillingAdmin:        billingStore,
		EmailSettings:       settingsStore,
		SignIns:             supabaseauth.NewAdmin(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey),
		Purger:              purger,
		StripeWebhookSecret: vault.Optional(secrets.NameStripeWebhook),
		Models:              llm.NewAdmin(settingsStore, openRouterClient, chatModel, editorModel),
		Watcher:             editor.NewModelWatcher(geminiClient, transformProcessor.Fetcher),
		WatchBiller:         credits.NewActionBiller(creditService, credits.ActionEditorWatch),
		Scenes:              editorScenes{generate: generateService, credits: creditService},
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
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	sweeper := &credits.Sweeper{Open: creditStore, Jobs: jobBiller, Searches: searchBiller, Avatars: avatarBiller}
	monitor := &providers.Monitor{
		Checker: providers.NewChecker(), Key: vault.Key, Alerts: alertService,
		Snapshot:  creditStore.SaveSnapshot,
		Threshold: func(ctx context.Context, key string) (int, bool, error) { return creditStore.Setting(ctx, key) },
	}
	go sweeper.Run(ctx)
	go chatService.RunReconciler(ctx, time.Minute)
	go purger.Run(ctx, 10*time.Minute)
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
			&worker.Pool[jobs.Job]{
				Name: "video_analysis", Capacity: 3, Timeout: analysis.HandleTimeout,
				Claim: func(ctx context.Context, n int) ([]jobs.Job, error) {
					return jobService.Claim(ctx, analysis.JobType, n, analysis.Lease)
				},
				Handle: analysisProcessor.Handle,
			},
			&worker.Pool[jobs.Job]{
				Name: "video_generate", Capacity: 3, Timeout: transform.HandleTimeout,
				Claim: func(ctx context.Context, n int) ([]jobs.Job, error) {
					return jobService.Claim(ctx, generate.JobType, n, transform.Lease)
				},
				Handle: transformProcessor.Handle,
			},
			&worker.Pool[publish.Post]{
				Name: "posts", Capacity: 2, Timeout: publish.HandleTimeout,
				Claim: func(ctx context.Context, n int) ([]publish.Post, error) {
					return postStore.Claim(ctx, n, publish.Lease)
				},
				Handle: postProcessor.Handle,
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

// vaultKeys adapts the key vault to what the social service reads by name.
func vaultKeys(v *secrets.Vault) social.Keys {
	return func(ctx context.Context, name string) (string, error) { return v.Key(name)(ctx) }
}
