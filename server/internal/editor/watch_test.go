package editor

import "testing"

func TestDecodeNotes(t *testing.T) {
	good := `{"summary":" A dog runs. ","speech":"","scenes":[
		{"start":0,"end":2,"description":"Dog in park"},
		{"start":3,"end":1,"description":"backwards"},
		{"start":1,"end":2,"description":""}]}`
	n, err := DecodeNotes([]byte(good))
	if err != nil || n.Summary != "A dog runs." || len(n.Scenes) != 1 {
		t.Fatalf("%+v %v", n, err)
	}
	for _, bad := range []string{`{`, `{"summary":"","speech":"","scenes":[]}`, `{"summary":"x","speech":"","scenes":[],"extra":1}`} {
		if _, err := DecodeNotes([]byte(bad)); err == nil {
			t.Errorf("accepted %s", bad)
		}
	}
}
