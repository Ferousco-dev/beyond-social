package chat

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
)

const goodScript = `{"title":"Dawn run","style":"cinematic, warm light","scenes":[
 {"seconds":5,"visual":"A runner laces her shoes at dawn","camera":"slow push in","voiceover":"Every morning starts here.","on_screen_text":""},
 {"seconds":8,"visual":"She sprints through a puddle in slow motion","camera":"low tracking shot","voiceover":"","on_screen_text":"RUN"}]}`

func TestDecodeScriptAcceptsAGoodScript(t *testing.T) {
	s, err := DecodeScript([]byte(goodScript))
	if err != nil || s.Title != "Dawn run" || len(s.Scenes) != 2 || s.TotalSeconds() != 13 {
		t.Fatalf("script = %+v err=%v", s, err)
	}
	text := s.Describe()
	for _, want := range []string{"Dawn run (13 seconds)", "Scene 1 (5s)", `Voice-over: "Every morning starts here."`, `Text on screen: "RUN"`, "use this script"} {
		if !strings.Contains(text, want) {
			t.Errorf("missing %q in %q", want, text)
		}
	}
}

func TestDecodeScriptRejectsWhatAClipCannotBe(t *testing.T) {
	for name, bad := range map[string]string{
		"not json":            "nope",
		"unknown field":       strings.Replace(goodScript, `"style"`, `"extra":1,"style"`, 1),
		"no scenes":           `{"title":"t","style":"","scenes":[]}`,
		"no title":            strings.Replace(goodScript, "Dawn run", " ", 1),
		"scene over 15s":      strings.Replace(goodScript, `"seconds":8`, `"seconds":40`, 1),
		"scene under 1s":      strings.Replace(goodScript, `"seconds":5`, `"seconds":0`, 1),
		"scene shows nothing": strings.Replace(goodScript, "A runner laces her shoes at dawn", " ", 1),
	} {
		if _, err := DecodeScript([]byte(bad)); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
}

func TestModelScriptWriterSendsHistoryAndTreatsTheMessageAsData(t *testing.T) {
	stub := &stubJSON{out: goodScript}
	s, err := NewModelScriptWriter(stub).Write(context.Background(), []Turn{{Role: RoleAssistant, Content: "earlier script"}}, "make scene 2 shorter", nil)
	if err != nil || s.Title != "Dawn run" {
		t.Fatalf("script = %+v err=%v", s, err)
	}
	if !strings.Contains(stub.seen, "assistant: earlier script") || !strings.HasSuffix(stub.seen, "Latest message: make scene 2 shorter") {
		t.Fatalf("prompt = %q", stub.seen)
	}
}

type stubWriter struct {
	calls int
	err   error
}

func (w *stubWriter) Write(context.Context, []Turn, string, []gemini.Media) (Script, error) {
	w.calls++
	s, _ := DecodeScript([]byte(goodScript))
	return s, w.err
}

func TestAScriptDecisionWritesAScriptAndKeepsItStructured(t *testing.T) {
	store, router, planner, writer := newMem(), &stubRouter{decision: Decision{Script: true}}, &stubPlanner{}, &stubWriter{}
	svc := NewService(store, router, planner).WithScriptWriter(writer)
	ex, err := svc.Send(context.Background(), "u1", "c1", "an ad for my trail shoe", "", nil, "")
	if err != nil {
		t.Fatal(err)
	}
	if writer.calls != 1 || planner.calls != 0 || ex.Assistant.Script == nil || ex.Assistant.Script.Title != "Dawn run" || !strings.Contains(ex.Assistant.Content, "Scene 1") {
		t.Fatalf("writer=%d planner=%d msg=%+v", writer.calls, planner.calls, ex.Assistant)
	}
}

func TestWithoutAScriptWriterTheIdeaGoesStraightToPlanning(t *testing.T) {
	planner := &stubPlanner{}
	svc := NewService(newMem(), &stubRouter{decision: Decision{Script: true}}, planner)
	ex, err := svc.Send(context.Background(), "u1", "c1", "an ad", "", nil, "")
	if err != nil || planner.calls != 1 || ex.Assistant.WorkflowID != "w1" {
		t.Fatalf("planner=%d ex=%+v err=%v", planner.calls, ex, err)
	}
}

func TestAScriptFailureSavesNoAssistantMessage(t *testing.T) {
	store := newMem()
	svc := NewService(store, &stubRouter{decision: Decision{Script: true}}, &stubPlanner{}).WithScriptWriter(&stubWriter{err: errors.New("down")})
	if _, err := svc.Send(context.Background(), "u1", "c1", "an ad", "k", nil, ""); err == nil {
		t.Fatal("expected an error")
	}
	for _, m := range store.msgs {
		if m.Role == RoleAssistant {
			t.Fatalf("saved %+v", m)
		}
	}
}
