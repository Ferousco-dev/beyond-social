package orchestrator

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// A reference lets one step use what an earlier one made: "${make.result.video_url}"
// is the video_url in the result of the step with id "make". References are
// checked when the plan is made (the step must be a dependency and the tool must
// offer that output) and filled in just before the step runs.
var refPattern = regexp.MustCompile(`\$\{([a-z0-9][a-z0-9_-]{0,31})\.([A-Za-z0-9_.]+)\}`)

// Ref is one reference found in a step's arguments.
type Ref struct{ Step, Path string }

// refsIn lists every reference in the arguments, in the order they appear.
func refsIn(value any) []Ref {
	var out []Ref
	mapStrings(value, func(s string) string {
		for _, m := range refPattern.FindAllStringSubmatch(s, -1) {
			out = append(out, Ref{Step: m[1], Path: m[2]})
		}
		return s
	})
	return out
}

// fill returns a copy of the arguments with each reference replaced by what
// value returns for it. A reference value cannot be found for is an error.
func fill(args map[string]any, value func(Ref) (string, bool)) (map[string]any, error) {
	var missing *Ref
	out := mapStrings(args, func(s string) string {
		return refPattern.ReplaceAllStringFunc(s, func(match string) string {
			m := refPattern.FindStringSubmatch(match)
			ref := Ref{Step: m[1], Path: m[2]}
			text, ok := value(ref)
			if !ok && missing == nil {
				missing = &ref
			}
			return text
		})
	}).(map[string]any)
	if missing != nil {
		return nil, fmt.Errorf("%s.%s is not available", missing.Step, missing.Path)
	}
	return out, nil
}

// mapStrings rebuilds maps and lists with every string passed through f.
func mapStrings(value any, f func(string) string) any {
	switch v := value.(type) {
	case string:
		return f(v)
	case map[string]any:
		out := make(map[string]any, len(v))
		for k, item := range v {
			out[k] = mapStrings(item, f)
		}
		return out
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = mapStrings(item, f)
		}
		return out
	}
	return value
}

// sampleFor is a harmless stand-in of the right shape, so a tool's own argument
// checks can run on a plan before the real value exists.
func sampleFor(kind string) string {
	switch kind {
	case KindID:
		return "00000000-0000-4000-8000-000000000000"
	case KindURL:
		return "https://example.com/sample.mp4"
	case KindNumber:
		return "1"
	}
	return "sample text"
}

// outputValue reads a dotted path out of a finished step's output.
func outputValue(output map[string]any, path string) (string, bool) {
	var current any = output
	for _, part := range strings.Split(path, ".") {
		m, ok := current.(map[string]any)
		if !ok {
			return "", false
		}
		if current, ok = m[part]; !ok {
			return "", false
		}
	}
	switch v := current.(type) {
	case string:
		return v, v != ""
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), true
	case int:
		return strconv.Itoa(v), true
	}
	return "", false
}
