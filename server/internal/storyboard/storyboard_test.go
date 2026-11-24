package storyboard

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"google.golang.org/genai"
)

type stub struct {
	out  string
	err  error
	seen string
}

func (s *stub) GenerateJSON(_ context.Context, _, user string, _ *genai.Schema) ([]byte, gemini.Usage, error) {
	s.seen = user
	return []byte(s.out), gemini.Usage{}, s.err
}

func planJSON(seconds ...int) string {
	var shots []string
	for i, sec := range seconds {
		shots = append(shots, fmt.Sprintf(`{"seconds":%d,"visual":"Shot %d: a woman at a desk","camera":"static","voiceover":"Line %d.","on_screen_text":""}`, sec, i+1, i+1))
	}
	return `{"title":"Desk tips","look":"Woman in her thirties, grey jumper, bright home office","shots":[` + strings.Join(shots, ",") + `]}`
}

func TestWriteMakesThePlanExactlyTheChosenLength(t *testing.T) {
	// 7 shots of 6s is 42s; the person chose 45s.
	st := &stub{out: planJSON(6, 6, 6, 6, 6, 6, 6)}
	plan, err := NewModelWriter(st).Write(context.Background(), Input{Script: "Five tips for a tidy desk", Seconds: 45, Language: "English"})
	if err != nil {
		t.Fatal(err)
	}
	if plan.TotalSeconds() != 45 {
		t.Fatalf("total = %d, want 45", plan.TotalSeconds())
	}
	for i, s := range plan.Shots {
		if s.Seconds < MinShotSeconds || s.Seconds > MaxShotSeconds {
			t.Errorf("shot %d is %d seconds", i+1, s.Seconds)
		}
	}
	for _, want := range []string{"exactly 45 seconds", "Language for the spoken words: English", "Five tips for a tidy desk"} {
		if !strings.Contains(st.seen, want) {
			t.Errorf("prompt is missing %q: %q", want, st.seen)
		}
	}
}

func TestFitShortensAndLengthens(t *testing.T) {
	long := Plan{Shots: []Shot{{Seconds: 8}, {Seconds: 8}, {Seconds: 8}}}
	got, err := Fit(long, 21)
	if err != nil || got.TotalSeconds() != 21 {
		t.Fatalf("shorten: %+v %v", got, err)
	}
	short := Plan{Shots: []Shot{{Seconds: 4}, {Seconds: 4}, {Seconds: 4}}}
	got, err = Fit(short, 15)
	if err != nil || got.TotalSeconds() != 15 {
		t.Fatalf("lengthen: %+v %v", got, err)
	}
	if short.TotalSeconds() != 12 {
		t.Error("Fit changed its input")
	}
}

func TestFitRefusesAPlanFarFromTheLength(t *testing.T) {
	plan := Plan{Shots: []Shot{{Seconds: 5}, {Seconds: 5}}}
	if _, err := Fit(plan, 60); !errors.Is(err, ErrInvalid) {
		t.Fatalf("a 10s plan for 60s was accepted: %v", err)
	}
	// Three shots top out at 24 seconds, and 28 is more than the allowed slack away.
	if _, err := Fit(Plan{Shots: []Shot{{Seconds: 8}, {Seconds: 8}, {Seconds: 8}}}, 28); !errors.Is(err, ErrInvalid) {
		t.Fatalf("an unreachable length was accepted: %v", err)
	}
}

func TestDecodeRefusesOnlyWhatCannotBeMended(t *testing.T) {
	good := planJSON(5, 5, 5)
	for name, bad := range map[string]string{
		"not json": "nope",
		"no shots": `{"title":"t","look":"l","shots":[]}`,
	} {
		if _, err := Decode([]byte(bad)); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
	if _, err := Decode([]byte(good)); err != nil {
		t.Fatal(err)
	}
	// Small slips are mended rather than failing the person's storyboard.
	short, err := Decode([]byte(strings.Replace(good, `"seconds":5`, `"seconds":1`, 1)))
	if err != nil || short.Shots[0].Seconds != MinShotSeconds {
		t.Fatalf("a short shot should be lengthened: %+v %v", short, err)
	}
	long, err := Decode([]byte(strings.Replace(good, `"seconds":5`, `"seconds":20`, 1)))
	if err != nil || long.Shots[0].Seconds != MaxShotSeconds {
		t.Fatalf("a long shot should be shortened: %+v %v", long, err)
	}
	empty, err := Decode([]byte(strings.Replace(good, "Shot 1: a woman at a desk", " ", 1)))
	if err != nil || len(empty.Shots) != 2 {
		t.Fatalf("a shot with nothing to show should be dropped: %+v %v", empty, err)
	}
	if _, err := Decode([]byte(strings.Replace(good, `"look"`, `"extra":1,"look"`, 1))); err != nil {
		t.Fatalf("an extra field should be ignored: %v", err)
	}
}

func TestFitStretchesAPlanThatIsFarOff(t *testing.T) {
	// Twelve 3-second shots (36 s) for a minute: each is stretched, not refused.
	shots := make([]Shot, 12)
	for i := range shots {
		shots[i] = Shot{Seconds: 3, Visual: "x"}
	}
	got, err := Fit(Plan{Shots: shots}, 60)
	if err != nil || got.TotalSeconds() != 60 {
		t.Fatalf("got %d seconds, %v", got.TotalSeconds(), err)
	}
	for _, s := range got.Shots {
		if s.Seconds < MinShotSeconds || s.Seconds > MaxShotSeconds {
			t.Fatalf("shot out of range: %+v", s)
		}
	}
}

func TestInputValidation(t *testing.T) {
	for name, in := range map[string]Input{
		"empty script": {Script: "  ", Seconds: 45},
		"too short":    {Script: "x", Seconds: 10},
		"too long":     {Script: "x", Seconds: 600},
		"huge script":  {Script: strings.Repeat("x", MaxScriptRunes+1), Seconds: 45},
	} {
		if err := in.Validate(); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: %v", name, err)
		}
	}
	if err := (Input{Script: "x", Seconds: 45}).Validate(); err != nil {
		t.Fatal(err)
	}
}

func TestAModelFailureIsReportedAndNothingIsReturned(t *testing.T) {
	_, err := NewModelWriter(&stub{err: errors.New("quota")}).Write(context.Background(), Input{Script: "x", Seconds: 30})
	if err == nil {
		t.Fatal("expected an error")
	}
}
