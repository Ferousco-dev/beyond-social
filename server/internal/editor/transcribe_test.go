package editor

import (
	"strings"
	"testing"
)

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
