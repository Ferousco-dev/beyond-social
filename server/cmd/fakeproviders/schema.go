package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// instance builds a value that satisfies a Gemini response schema, in either
// Gemini's own form (type "OBJECT") or JSON Schema form (type "object").
// Strings read as plain test text named after their field; numbers respect
// their bounds; timings in a list rise with the item, as speech does.
func instance(schema map[string]any, name string, index int) any {
	if values, ok := schema["enum"].([]any); ok && len(values) > 0 {
		return values[0]
	}
	switch strings.ToLower(text(schema["type"])) {
	case "object":
		out := map[string]any{}
		properties, _ := schema["properties"].(map[string]any)
		for key, raw := range properties {
			if child, ok := raw.(map[string]any); ok {
				out[key] = instance(child, key, index)
			}
		}
		return out
	case "array":
		items, _ := schema["items"].(map[string]any)
		count := clamp(3, number(schema["minItems"], 0), number(schema["maxItems"], 3))
		list := make([]any, 0, int(count))
		for i := 0; i < int(count); i++ {
			if items == nil {
				list = append(list, fmt.Sprintf("Test %s %d", name, i+1))
				continue
			}
			list = append(list, instance(items, singular(name), i))
		}
		return list
	case "integer":
		return int64(numberFor(schema, name, index))
	case "number":
		return numberFor(schema, name, index)
	case "boolean":
		return false
	default:
		return stringFor(schema, name, index)
	}
}

func numberFor(schema map[string]any, name string, index int) float64 {
	low, high := number(schema["minimum"], 0), number(schema["maximum"], 1e9)
	lower := strings.ToLower(name)
	var want float64
	switch {
	case strings.Contains(lower, "end"):
		want = float64(index)*0.5 + 0.4
	case strings.Contains(lower, "start"), strings.Contains(lower, "at"), strings.Contains(lower, "time"):
		want = float64(index) * 0.5
	case strings.Contains(lower, "second"), strings.Contains(lower, "duration"), strings.Contains(lower, "length"):
		want = 8
	case strings.Contains(lower, "score"), strings.Contains(lower, "confidence"):
		want = 0.8
	default:
		want = 1
	}
	return clamp(want, low, high)
}

func stringFor(schema map[string]any, name string, index int) string {
	lower := strings.ToLower(name)
	switch {
	case text(schema["format"]) == "date-time":
		return time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)
	case strings.Contains(lower, "url"):
		return "https://example.com/test"
	case lower == "word" || lower == "text" && index >= 0 && strings.Contains(text(schema["description"]), "word"):
		return fmt.Sprintf("word%d", index+1)
	case strings.Contains(lower, "hashtag"):
		return "#test"
	}
	value := fmt.Sprintf("Test %s %d for the sample video.", strings.ReplaceAll(name, "_", " "), index+1)
	if limit := number(schema["maxLength"], 0); limit > 0 && float64(len(value)) > limit {
		value = value[:int(limit)]
	}
	return value
}

func singular(name string) string { return strings.TrimSuffix(name, "s") }

func text(value any) string {
	s, _ := value.(string)
	return s
}

// number reads a bound that Gemini sends as a JSON number or, for 64-bit fields, a string.
func number(value any, fallback float64) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case string:
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			return parsed
		}
	}
	return fallback
}

func clamp(value, low, high float64) float64 { return max(low, min(value, high)) }
