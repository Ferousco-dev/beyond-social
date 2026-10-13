package sandbox_test

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/sandbox"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

const secret = "whsec_test"

var (
	events   []string
	eventsMu sync.Mutex
)

// start runs the sandbox over https, as the product expects, and a stand-in for
// the product's own webhook that checks every event's signature.
func start(t *testing.T) *sandbox.Server {
	t.Helper()
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if err := billing.VerifySignature(body, r.Header.Get("Stripe-Signature"), secret, time.Now()); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		eventsMu.Lock()
		events = append(events, string(body))
		eventsMu.Unlock()
	}))
	t.Cleanup(api.Close)

	pair, certPEM, err := sandbox.Certificate()
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewUnstartedServer(nil)
	srv.TLS = &tls.Config{Certificates: []tls.Certificate{pair}}
	srv.StartTLS()
	t.Cleanup(srv.Close)
	sandbox.Trust(certPEM)

	s := sandbox.New(srv.URL, api.URL, secret)
	srv.Config.Handler = s.Handler()
	return s
}

func TestKIEUploadGenerateAndDownload(t *testing.T) {
	s := start(t)
	ctx := context.Background()
	client := kie.NewClient("test").WithBaseURLs(s.Base+"/kie", s.Base+"/kie")

	if link, err := client.Upload(ctx, "a.mp4", "video/mp4", []byte("x")); err != nil || !strings.HasPrefix(link, "https://") {
		t.Fatalf("upload: %q %v", link, err)
	}
	id, err := client.CreateModelTask(ctx, kie.Model, map[string]any{"prompt": "x"}, "")
	if err != nil {
		t.Fatal(err)
	}
	first, err := client.GetTask(ctx, id)
	if err != nil || first.State != kie.StatePending {
		t.Fatalf("first poll: %+v %v", first, err)
	}
	done, err := client.GetTask(ctx, id)
	if err != nil || done.State != kie.StateSuccess || len(done.ResultURLs) != 1 {
		t.Fatalf("second poll: %+v %v", done, err)
	}
	data, err := safenet.Fetch(ctx, safenet.NewClient(10*time.Second), done.ResultURLs[0], 10<<20)
	if err != nil {
		t.Fatalf("the guarded downloader could not reach the sandbox clip: %v", err)
	}
	if mime, err := safenet.SniffVideo(data); err != nil || mime != "video/mp4" {
		t.Fatalf("the clip is not a video: %q %v", mime, err)
	}
}

func TestHeyGenAvatarTrainingVoicesAndVideo(t *testing.T) {
	s := start(t)
	ctx := context.Background()
	client := heygen.NewClient("test").WithBaseURL(s.Base + "/heygen")

	twin, err := client.CreateDigitalTwin(ctx, "Me", s.Base+"/files/clip.mp4", "k1")
	if err != nil || twin.Status != heygen.StatusPendingConsent {
		t.Fatalf("create: %+v %v", twin, err)
	}
	consent, err := client.CreateConsent(ctx, twin.GroupID, "", "k2")
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := client.GetGroup(ctx, twin.GroupID); got.Status != heygen.StatusPendingConsent {
		t.Fatalf("before consent: %+v", got)
	}
	resp, err := http.Get(consent) // the person opening the consent page
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("consent page: %v", err)
	}
	resp.Body.Close()
	var group heygen.Twin
	for i := 0; i < 4 && group.Status != heygen.StatusCompleted; i++ {
		if group, err = client.GetGroup(ctx, twin.GroupID); err != nil {
			t.Fatal(err)
		}
	}
	if group.Status != heygen.StatusCompleted || group.DefaultVoiceID == "" || group.PreviewImage == "" {
		t.Fatalf("after training: %+v", group)
	}

	page, err := client.ListVoices(ctx, heygen.VoiceQuery{Type: "public"})
	if err != nil || len(page.Voices) != 2 {
		t.Fatalf("voices: %+v %v", page, err)
	}
	if _, ok, err := client.GetVoice(ctx, group.DefaultVoiceID); err != nil || !ok {
		t.Fatalf("voice: %v %v", ok, err)
	}
	if _, ok, _ := client.GetVoice(ctx, "nope"); ok {
		t.Fatal("an unknown voice exists")
	}

	vid, err := client.CreateVideo(ctx, heygen.VideoRequest{AvatarID: twin.LookID, VoiceID: group.DefaultVoiceID, Script: "hello"}, "k3")
	if err != nil {
		t.Fatal(err)
	}
	if v, _ := client.GetVideo(ctx, vid); v.Status != heygen.VideoProcessing {
		t.Fatalf("first read: %+v", v)
	}
	if v, err := client.GetVideo(ctx, vid); err != nil || v.Status != heygen.VideoCompleted || v.VideoURL == "" || v.DurationSecond != 3 {
		t.Fatalf("second read: %+v %v", v, err)
	}
	if err := client.DeleteAvatarGroup(ctx, twin.GroupID); err != nil {
		t.Fatal(err)
	}
}

func TestApifyReturnsVideosThatNormalise(t *testing.T) {
	s := start(t)
	ctx := context.Background()
	client := apify.NewClient("test").WithBaseURL(s.Base + "/apify")
	for platform, actor := range map[video.Platform]string{video.TikTok: apify.DefaultTikTokActor, video.Instagram: apify.DefaultInstagramActor} {
		run, err := client.StartRun(ctx, actor, map[string]any{}, apify.RunOptions{})
		if err != nil || !run.Finished() {
			t.Fatalf("%s run: %+v %v", platform, run, err)
		}
		rows, err := client.Items(ctx, run.DefaultDatasetID, 20)
		if err != nil {
			t.Fatal(err)
		}
		videos, err := apify.Normalize(platform, rows, time.Now())
		if err != nil || len(videos) < 5 || videos[0].VideoURL == "" || videos[0].ThumbnailURL == "" {
			t.Fatalf("%s: %d videos, err %v", platform, len(videos), err)
		}
	}
}

func TestStripeCheckoutSendsSignedEvents(t *testing.T) {
	s := start(t)
	ctx := context.Background()
	stripe := billing.NewStripe(func(context.Context) (string, error) { return "sk_test", nil }).WithBase(s.Base+"/stripe", nil)

	_, link, err := stripe.CreateCheckout(ctx, billing.CheckoutInput{PaymentID: "p1", UserID: "u1", PackName: "Starter", Credits: 100, AmountCents: 500, Currency: "usd", SuccessURL: "https://app.example/ok", CancelURL: "https://app.example/no"})
	if err != nil {
		t.Fatal(err)
	}
	if err := pay(link); err != nil {
		t.Fatal(err)
	}
	_, link, err = stripe.CreateSubscription(ctx, billing.SubscribeInput{UserID: "u1", PriceCents: 2000, Currency: "usd", SuccessURL: "https://app.example/ok", CancelURL: "https://app.example/no"})
	if err != nil {
		t.Fatal(err)
	}
	if err := pay(link); err != nil {
		t.Fatal(err)
	}
	eventsMu.Lock()
	defer eventsMu.Unlock()
	joined := strings.Join(events, "\n")
	for _, want := range []string{`"payment_status":"paid"`, `"client_reference_id":"p1"`, "customer.subscription.updated", "invoice.paid", `"status":"active"`} {
		if !strings.Contains(joined, want) {
			t.Errorf("no event with %s in:\n%s", want, joined)
		}
	}
}

// pay is a person pressing the button on the sandbox checkout page.
func pay(link string) error {
	client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	resp, err := client.PostForm(link, url.Values{})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusSeeOther {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("status %d: %s", resp.StatusCode, b)
	}
	return nil
}

func TestSocialSignInAndPublish(t *testing.T) {
	s := start(t)
	ctx := context.Background()
	creds := social.Credentials{ID: "id", Secret: "secret"}
	in := social.PublishInput{Caption: "hi", Video: make([]byte, 1000), MIME: "video/mp4", VideoURL: s.Base + "/files/clip.mp4", AccountID: "17841sandbox"}

	for _, p := range []social.Provider{social.NewYouTube().Redirect(s.Base), social.NewTikTok().Redirect(s.Base), social.NewInstagram().Redirect(s.Base)} {
		auth := p.AuthorizeURL(creds, "https://app.example/cb", "state1", "challenge")
		resp, err := (&http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}).Get(auth)
		if err != nil || resp.StatusCode != http.StatusFound || !strings.Contains(resp.Header.Get("Location"), "state=state1") {
			t.Fatalf("%s sign-in page: %v %v", p.Platform(), resp, err)
		}
		tokens, account, err := p.Exchange(ctx, creds, "https://app.example/cb", "sandbox-code", "verifier")
		if err != nil || tokens.Access == "" || account.ID == "" {
			t.Fatalf("%s exchange: %+v %+v %v", p.Platform(), tokens, account, err)
		}
		if p.Platform() == social.Instagram {
			in.AccountID = account.ID
		}
		published, err := p.(social.Publisher).Publish(ctx, tokens, in)
		if err != nil || published.ID == "" {
			t.Fatalf("%s publish: %+v %v", p.Platform(), published, err)
		}
	}
	seen := map[string]bool{}
	for _, p := range sandbox.PostedVideos() {
		seen[p.Platform] = true
	}
	if !seen["youtube"] || !seen["tiktok"] || !seen["instagram"] {
		t.Fatalf("the platforms received %v", sandbox.PostedVideos())
	}
}

func TestModelAnswersFitEveryShapeTheProductAsksFor(t *testing.T) {
	s := start(t)
	ctx := context.Background()
	client, err := gemini.NewClient(gemini.Config{APIKey: "test", HTTPClient: sandbox.Client(s.Base)})
	if err != nil {
		t.Fatal(err)
	}

	router := chat.NewModelRouter(client)
	for message, check := range map[string]func(chat.Decision) bool{
		"hello there":                               func(d chat.Decision) bool { return d.Reply != "" && !d.Script && !d.Create },
		"make a video about street food":            func(d chat.Decision) bool { return d.Script },
		"yes use it and post it to instagram":       func(d chat.Decision) bool { return d.Create && d.Post != nil && d.Post.Platform == social.Instagram },
		"remember my audience is Nigerian founders": func(d chat.Decision) bool { return d.Remember != "" },
	} {
		d, err := router.Route(ctx, chat.RouteInput{Message: message, Now: time.Now()})
		if err != nil || !check(d) {
			t.Errorf("router %q: %+v %v", message, d, err)
		}
	}

	script, err := chat.NewModelScriptWriter(client).Write(ctx, nil, "a short video about street food", nil)
	if err != nil || len(script.Scenes) == 0 || script.Describe() == "" {
		t.Fatalf("script: %+v %v", script, err)
	}

	planner := orchestrator.NewPlanner(client, orchestrator.DefaultRegistry())
	plan, err := planner.Plan(ctx, "make a video about street food", orchestrator.ContextView{})
	if err != nil || !plan.Ready || len(plan.Plan.Steps) != 1 {
		t.Fatalf("plan: %+v %v", plan, err)
	}

	reply, err := editor.NewModelAssistant(client).Assist(ctx, nil, "make it faster", "{}", "")
	if err != nil || reply.Reply == "" {
		t.Fatalf("assistant: %+v %v", reply, err)
	}
	if text, err := memory.NewSummarizer(client).Summarize(ctx, "", []memory.Turn{{Role: "user", Content: "hi"}}); err != nil || text == "" {
		t.Fatalf("summary: %q %v", text, err)
	}
	words, err := editor.NewModelTranscriber(client, safenet.NewFetcher(10*time.Second)).Transcribe(ctx, s.Base+"/files/clip.mp4")
	if err != nil || len(words) == 0 {
		t.Fatalf("transcribe: %v %v", words, err)
	}
}
