package editor

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestValidateDocument(t *testing.T) {
	for name, doc := range map[string]string{
		"array":  `[]`,
		"null":   `null`,
		"string": `"x"`,
		"broken": `{`,
		"huge":   `{"a":"` + strings.Repeat("x", MaxDocumentBytes) + `"}`,
	} {
		if err := ValidateDocument(json.RawMessage(doc)); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s accepted: %v", name, err)
		}
	}
	if err := ValidateDocument(json.RawMessage(`{"tracks":[]}`)); err != nil {
		t.Fatal(err)
	}
}

func TestValidateTitle(t *testing.T) {
	if got, err := ValidateTitle("  Ad  "); err != nil || got != "Ad" {
		t.Fatalf("%q %v", got, err)
	}
	for _, bad := range []string{"", "   ", strings.Repeat("x", MaxTitleRunes+1)} {
		if _, err := ValidateTitle(bad); !errors.Is(err, ErrInvalid) {
			t.Errorf("%q accepted", bad)
		}
	}
}
