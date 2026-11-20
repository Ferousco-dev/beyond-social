package editor

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type stubFetcher map[string][]byte

func (s stubFetcher) Fetch(_ context.Context, url string, _ int64) ([]byte, error) {
	data, ok := s[url]
	if !ok {
		return nil, errors.New("not found")
	}
	return data, nil
}

func TestLoadTranscribable(t *testing.T) {
	mp4 := append([]byte{0, 0, 0, 24}, append([]byte("ftypisom"), make([]byte, 8)...)...)
	m4a := append([]byte{0, 0, 0, 24}, append([]byte("ftypM4A "), make([]byte, 8)...)...)
	mp3 := append([]byte("ID3"), make([]byte, 16)...)
	wav := append([]byte("RIFF\x00\x00\x00\x00WAVE"), make([]byte, 8)...)

	fetcher := stubFetcher{
		"mp4": mp4,
		"m4a": m4a,
		"mp3": mp3,
		"wav": wav,
		"bad": []byte("not media"),
	}
	want := map[string]string{
		"mp4": "video/mp4",
		"m4a": "audio/mp4",
		"mp3": "audio/mpeg",
		"wav": "audio/wav",
	}
	for name, expected := range want {
		got, err := loadTranscribable(context.Background(), fetcher, name)
		if err != nil || got.MIME != expected {
			t.Fatalf("%s: got (%q, %v), want %q", name, got.MIME, err, expected)
		}
	}
	if _, err := loadTranscribable(context.Background(), fetcher, "bad"); !errors.Is(err, ErrUnusable) {
		t.Fatalf("bad: got %v, want ErrUnusable", err)
	}
}

func TestDecodeWordsDropsBadTimesAndTrimsOverlap(t *testing.T) {
	in := `{"words":[
		{"text":" there ","start":1.0,"end":1.6},
		{"text":"Hello","start":0.0,"end":1.2},
		{"text":"","start":2,"end":3},
		{"text":"backwards","start":5,"end":4},
		{"text":"negative","start":-1,"end":1},
		{"text":"forever","start":1,"end":99999}
	]}`
	words, err := DecodeWords([]byte(in))
	if err != nil || len(words) != 2 {
		t.Fatalf("%+v %v", words, err)
	}
	if words[0].Text != "Hello" || words[1].Text != "there" {
		t.Fatalf("order: %+v", words)
	}
	if words[0].End != 1.0 {
		t.Fatalf("overlap kept: %+v", words[0])
	}
}

func TestDecodeWordsRejectsBadShape(t *testing.T) {
	for _, bad := range []string{`{`, `{"words":[],"x":1}`, `{"words":[{"text":"a","start":0,"end":1,"extra":1}]}`} {
		if _, err := DecodeWords([]byte(bad)); err == nil {
			t.Errorf("accepted %s", bad)
		}
	}
	if words, err := DecodeWords([]byte(`{"words":[]}`)); err != nil || len(words) != 0 {
		t.Fatalf("empty: %v %v", words, err)
	}
	long := `{"words":[{"text":"` + strings.Repeat("a", 41) + `","start":0,"end":1}]}`
	if words, _ := DecodeWords([]byte(long)); len(words) != 0 {
		t.Fatal("overlong word kept")
	}
}
