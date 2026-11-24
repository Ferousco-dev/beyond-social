package autofill

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"google.golang.org/genai"
)

type stubModel struct {
	reply  string
	err    error
	prompt string
}

func (m *stubModel) GenerateJSON(_ context.Context, _, user string, _ *genai.Schema) ([]byte, gemini.Usage, error) {
	m.prompt = user
	return []byte(m.reply), gemini.Usage{}, m.err
}

type stubLibrary struct{ assets []assetlib.Asset }

func (l stubLibrary) List(context.Context, string) ([]assetlib.Asset, error) { return l.assets, nil }
func (l stubLibrary) ListGroups(context.Context, string) ([]assetlib.Group, error) {
	return []assetlib.Group{{ID: "g1", Name: "Ada"}}, nil
}

func library() []assetlib.Asset {
	now := time.Now()
	g := "g1"
	return []assetlib.Asset{
		{ID: "face-ok", Kind: assetlib.KindFace, Label: "Ada front", ConsentAt: &now, GroupID: &g},
		{ID: "face-no-consent", Kind: assetlib.KindFace, Label: "Bola"},
		{ID: "voice-ok", Kind: assetlib.KindVoice, Label: "Ada voice", ConsentAt: &now, GroupID: &g},
		{ID: "serum", Kind: assetlib.KindProduct, Label: "Glow serum"},
	}
}

func TestFillKeepsOnlyChoicesTheFormCanShow(t *testing.T) {
	m := &stubModel{reply: `{"title":"Serum launch","objective":"Promote my new serum","purpose":"launch-party","audience":{"gender":"female","ages":["25-34","99+","25-34"],"interests":["Beauty"]},
	"product":"Glow serum","language":"","platform":"YouTube","seconds":45,"visual_style":"Neon","environment":"Home","content_kind":"Human-led",
	"hook":"Stop scrolling","scenes":"Ada holds the serum","dialogue":"This changed my skin","tone":"Calm","cta":"Shop now, link in bio","speaker_mode":"single",
	"face_asset_id":"face-ok","voice_asset_id":"voice-ok","product_asset_id":"made-up-id","environment_asset_id":"serum"}`}
	svc := NewService(m, stubLibrary{assets: library()})
	b, err := svc.Fill(context.Background(), "u1", "A video for my new glow serum, me talking to camera", 0)
	if err != nil {
		t.Fatal(err)
	}
	if b.Purpose != "promotion" || b.Platform != "TikTok" || b.VisualStyle != "" || b.Language != "English" {
		t.Fatalf("unknown options must fall back to the form's defaults: %+v", b)
	}
	if b.Seconds != 30 && b.Seconds != 60 {
		t.Fatalf("45 s should snap to a length the form offers, got %d", b.Seconds)
	}
	if len(b.Audience.Ages) != 1 || b.Audience.Ages[0] != "25-34" {
		t.Fatalf("ages = %v", b.Audience.Ages)
	}
	if b.FaceAssetID != "face-ok" {
		t.Fatalf("an owned, consented face is kept: %+v", b)
	}
	if b.VoiceAssetID != "" {
		t.Fatalf("a recording must never be chosen: it would replace the written dialogue: %+v", b)
	}
	if b.ProductAssetID != "" || b.EnvironmentAssetID != "" {
		t.Fatalf("an invented id or an asset of the wrong kind must be dropped: %+v", b)
	}
	if !strings.Contains(m.prompt, "Ada front") || !strings.Contains(m.prompt, "group Ada") || !strings.Contains(m.prompt, "not usable yet") {
		t.Fatalf("the model should see the library with groups and consent: %s", m.prompt)
	}
}

func TestAFaceWithoutConsentIsNeverChosen(t *testing.T) {
	b := Clean(Brief{FaceAssetID: "face-no-consent", VoiceAssetID: "voice-ok"}, library())
	if b.FaceAssetID != "" || b.VoiceAssetID != "" {
		t.Fatalf("no consent, no face; and never a recording: %+v", b)
	}
}

func TestFillRefusesEmptyIdeasAndReportsModelFailures(t *testing.T) {
	svc := NewService(&stubModel{err: errors.New("busy")}, stubLibrary{})
	if _, err := svc.Fill(context.Background(), "u1", "  ", 0); !errors.Is(err, ErrInvalid) {
		t.Fatalf("empty idea: %v", err)
	}
	if _, err := svc.Fill(context.Background(), "u1", "a coffee video", 0); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("model failure: %v", err)
	}
}

func TestAChosenLengthIsKeptAndTheScriptIsAskedToFitIt(t *testing.T) {
	m := &stubModel{reply: `{"seconds":10,"hook":"h","scenes":"s","dialogue":"d"}`}
	svc := NewService(m, stubLibrary{})
	b, err := svc.Fill(context.Background(), "u1", "a coffee video", 60)
	if err != nil || b.Seconds != 60 {
		t.Fatalf("seconds = %d, %v; the person's choice must stand", b.Seconds, err)
	}
	if !strings.Contains(m.prompt, "exactly 60 seconds") || !strings.Contains(m.prompt, "150 spoken words") {
		t.Fatalf("the model was not told the length: %s", m.prompt)
	}
	if _, err := svc.Fill(context.Background(), "u1", "a coffee video", 7); !errors.Is(err, ErrInvalid) {
		t.Fatalf("a length the form does not offer must be refused: %v", err)
	}
}

func TestLengthIsNeverTooShortForTheWords(t *testing.T) {
	line := "Hello! I am just here showing anything that is actually good today."
	// Twelve words fit five seconds: a 5 s pick stands.
	if b := Clean(Brief{Seconds: 5, Dialogue: line}, nil); b.Seconds != 5 {
		t.Fatalf("12 words in 5 s became %d s", b.Seconds)
	}
	// A pick too short for its words is raised to the shortest that fits.
	long := strings.Repeat("word ", 30)
	if b := Clean(Brief{Seconds: 5, Dialogue: long}, nil); b.Seconds != 15 {
		t.Fatalf("30 words should need 15 s, got %d", b.Seconds)
	}
	// A longer pick stands: a video may have scenes with nobody speaking.
	if b := Clean(Brief{Seconds: 30, Dialogue: line}, nil); b.Seconds != 30 {
		t.Fatalf("a longer choice was changed to %d", b.Seconds)
	}
	if got := shortestFitting(12); got != 5 {
		t.Fatalf("shortestFitting(12) = %d", got)
	}
	// The call to action is spoken too: 12 words plus "Follow for more" no longer fit 5 s.
	if b := Clean(Brief{Seconds: 5, Dialogue: line, CTA: "Follow for more"}, nil); b.Seconds != 8 {
		t.Fatalf("12 words plus a 3-word call to action need 8 s, got %d", b.Seconds)
	}
}

func TestThePromptAsksForTheShortestFittingLengthAndExactWords(t *testing.T) {
	for _, rule := range []string{"word for word", "shortest allowed length that fits", "12 words fit 5 seconds"} {
		if !strings.Contains(system, rule) {
			t.Fatalf("the instructions lost %q", rule)
		}
	}
}
