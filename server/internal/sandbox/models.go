package sandbox

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// mountModels fakes Gemini's generateContent. The product always asks for JSON
// in a fixed shape, so the answer is built from that shape, with a few sensible
// choices driven by what the person typed so the main flows can be walked through.
func (s *Server) mountModels(mux *http.ServeMux) {
	mux.HandleFunc("POST /gemini/v1beta/models/{call}", func(w http.ResponseWriter, r *http.Request) {
		var req map[string]any
		if err := json.NewDecoder(io.LimitReader(r.Body, 32<<20)).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": map[string]any{"code": 400, "message": "bad request", "status": "INVALID_ARGUMENT"}})
			return
		}
		schema, _ := dig(req, "generationConfig", "responseSchema").(map[string]any)
		text := lastText(req)
		answer, _ := json.Marshal(reply(schema, text))
		writeJSON(w, http.StatusOK, map[string]any{
			"candidates": []any{map[string]any{
				"content":      map[string]any{"role": "model", "parts": []any{map[string]any{"text": string(answer)}}},
				"finishReason": "STOP",
			}},
			"usageMetadata": map[string]any{"promptTokenCount": 100, "candidatesTokenCount": 50, "totalTokenCount": 150},
		})
	})
}

// Client returns an HTTP client that sends Gemini requests to the sandbox.
func Client(base string) *http.Client {
	target, _ := url.Parse(strings.TrimRight(base, "/"))
	return &http.Client{Transport: redirect{target: target, next: http.DefaultTransport}}
}

type redirect struct {
	target *url.URL
	next   http.RoundTripper
}

func (t redirect) RoundTrip(req *http.Request) (*http.Response, error) {
	clone := req.Clone(req.Context())
	clone.URL.Scheme, clone.URL.Host, clone.Host = t.target.Scheme, t.target.Host, t.target.Host
	clone.URL.Path = "/gemini" + req.URL.Path
	return t.next.RoundTrip(clone)
}

func dig(m map[string]any, path ...string) any {
	var cur any = m
	for _, key := range path {
		next, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = next[key]
	}
	return cur
}

// lastText is what the person last said: the text after "Latest message:" when
// the product framed it, otherwise the final text part.
func lastText(req map[string]any) string {
	contents, _ := req["contents"].([]any)
	last := ""
	for _, c := range contents {
		parts, _ := dig(c.(map[string]any), "parts").([]any)
		for _, p := range parts {
			if t, ok := p.(map[string]any)["text"].(string); ok {
				last = t
			}
		}
	}
	if i := strings.LastIndex(last, "Latest message:"); i >= 0 {
		last = last[i+len("Latest message:"):]
	}
	return strings.TrimSpace(last)
}

var (
	wantsVideo = regexp.MustCompile(`(?i)\b(make|create|generate|video (about|on|of))\b`)
	accepts    = regexp.MustCompile(`(?i)^(yes|use it|go ahead|approve|ok|okay|looks good|do it)\b`)
	rememberRe = regexp.MustCompile(`(?i)\bremember( that)? (.+)`)
)

func platformIn(text string) string {
	lower := strings.ToLower(text)
	for _, p := range []string{"instagram", "tiktok", "youtube"} {
		if strings.Contains(lower, p) {
			return p
		}
	}
	return ""
}

func reply(schema map[string]any, text string) any {
	props, _ := schema["properties"].(map[string]any)
	has := func(name string) bool { _, ok := props[name]; return ok }
	short := text
	if len(short) > 80 {
		short = short[:80]
	}
	switch {
	case has("intent") && has("post_platform"):
		out := fill(schema, "", 0, text).(map[string]any)
		switch {
		case accepts.MatchString(text):
			out["intent"] = "create"
		case wantsVideo.MatchString(text):
			out["intent"] = "script"
		default:
			out["intent"], out["reply"] = "chat", "Sandbox answer. You said: "+short
		}
		if p := platformIn(text); p != "" && out["intent"] != "chat" {
			out["post_platform"] = p
		}
		if m := rememberRe.FindStringSubmatch(text); m != nil {
			out["remember"] = "The user said: " + strings.TrimSpace(m[2])
		}
		return out
	case has("steps") && has("objective"):
		return map[string]any{
			"version": 1, "objective": "Make a short video: " + short, "missing_info": []string{}, "unsupported": []string{},
			"steps": []any{map[string]any{
				"id": "make", "tool": "generate_video", "needs": []string{}, "confirm": true,
				"args": map[string]any{"scenes": []any{map[string]any{"prompt": "A calm sandbox scene. " + short, "seconds": 5}}},
			}},
		}
	case has("operations") && has("reply"):
		out := fill(schema, "", 0, text).(map[string]any)
		out["reply"], out["operations"] = "Sandbox assistant: noted. "+short, []any{}
		return out
	}
	return fill(schema, "", 0, text)
}

// fill builds a valid value for a schema. Arrays are short, enums take their
// first choice, and a few field names get believable values.
func fill(schema map[string]any, key string, idx int, text string) any {
	if schema == nil {
		return map[string]any{}
	}
	if enum, ok := schema["enum"].([]any); ok && len(enum) > 0 {
		return enum[0]
	}
	switch strings.ToUpper(asString(schema["type"])) {
	case "OBJECT":
		out := map[string]any{}
		props, _ := schema["properties"].(map[string]any)
		for name, p := range props {
			out[name] = fill(p.(map[string]any), name, idx, text)
		}
		return out
	case "ARRAY":
		items, _ := schema["items"].(map[string]any)
		switch key {
		case "operations", "steps", "missing_info", "unsupported", "hashtags", "needs":
			return []any{}
		}
		count := 2
		if key == "words" {
			count = 6
		}
		out := make([]any, count)
		for i := range out {
			out[i] = fill(items, key, i, text)
		}
		return out
	case "INTEGER", "NUMBER":
		switch key {
		case "seconds":
			return 5
		case "start":
			return float64(idx) * 0.4
		case "end":
			return float64(idx)*0.4 + 0.35
		}
		return 0
	case "BOOLEAN":
		return false
	}
	return stringFor(schema, key, idx)
}

var spoken = []string{"This", "is", "a", "sandbox", "voice", "sample"}

func stringFor(schema map[string]any, key string, idx int) string {
	value := "Sandbox " + key
	switch key {
	case "text":
		value = spoken[idx%len(spoken)]
	case "title":
		value = "Sandbox video"
	case "summary":
		value = "Sandbox notes: a short clip with a test pattern and a tone."
	case "reply", "speech", "voiceover":
		value = "This is a sandbox reply."
	case "remember", "post_platform", "post_at", "post_caption", "item_id", "edge", "color":
		value = ""
	case "description", "visual":
		value = "A test pattern with a steady tone."
	}
	if max, ok := schema["maxLength"].(string); ok && len(max) > 0 {
		var n int
		for _, c := range max {
			n = n*10 + int(c-'0')
		}
		if n > 0 && len(value) > n {
			value = value[:n]
		}
	}
	return value
}

func asString(v any) string { s, _ := v.(string); return s }
