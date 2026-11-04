package editor

import (
	"context"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"google.golang.org/genai"
)

type stubClient struct {
	out    string
	prompt string
}

func (s *stubClient) GenerateJSON(_ context.Context, _, user string, _ *genai.Schema) ([]byte, gemini.Usage, error) {
	s.prompt = user
	return []byte(s.out), gemini.Usage{}, nil
}

func TestDecodeReply(t *testing.T) {
	good := `{"reply":" Done. ","operations":[{"op":"seek","item_id":"","text":"","at":3,"start":0,"duration":0,"edge":"","volume":0,"color":"","size":0,"y":0,"speed":0}]}`
	r, err := DecodeReply([]byte(good))
	if err != nil || r.Reply != "Done." || len(r.Operations) != 1 || r.Operations[0].At != 3 {
		t.Fatalf("%+v %v", r, err)
	}
	for name, bad := range map[string]string{
		"unknown op":    `{"reply":"x","operations":[{"op":"format_disk"}]}`,
		"unknown field": `{"reply":"x","operations":[],"extra":1}`,
		"long text":     `{"reply":"x","operations":[{"op":"add_text","text":"` + strings.Repeat("a", 201) + `"}]}`,
		"broken":        `{`,
	} {
		if _, err := DecodeReply([]byte(bad)); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	many := `{"reply":"x","operations":[` + strings.Repeat(`{"op":"seek"},`, MaxOperations) + `{"op":"seek"}]}`
	if _, err := DecodeReply([]byte(many)); err == nil {
		t.Error("too many operations accepted")
	}
}

func TestAssistSendsStateAndHistory(t *testing.T) {
	stub := &stubClient{out: `{"reply":"ok","operations":[]}`}
	r, err := NewModelAssistant(stub).Assist(context.Background(), []Turn{{Role: "user", Content: "hi"}}, "cut it", `{"items":[]}`, "user: a trail running shoe ad")
	if err != nil || r.Reply != "ok" {
		t.Fatalf("%+v %v", r, err)
	}
	for _, want := range []string{`{"items":[]}`, "user: hi", "Latest message: cut it", "trail running shoe ad"} {
		if !strings.Contains(stub.prompt, want) {
			t.Errorf("prompt lacks %q", want)
		}
	}
}
