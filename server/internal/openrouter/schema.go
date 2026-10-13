package openrouter

import (
	"strings"

	"google.golang.org/genai"
)

// jsonSchema turns the schema the product already writes for Gemini into the
// JSON Schema OpenRouter's structured outputs expect. Length limits are left
// out because not every model honours them; every reply is checked again on
// our side anyway.
func jsonSchema(s *genai.Schema) map[string]any {
	if s == nil {
		return map[string]any{}
	}
	out := map[string]any{"type": strings.ToLower(string(s.Type))}
	if len(s.Enum) > 0 {
		out["enum"] = s.Enum
	}
	if s.Type == genai.TypeObject {
		props := make(map[string]any, len(s.Properties))
		for name, p := range s.Properties {
			props[name] = jsonSchema(p)
		}
		out["properties"] = props
		out["required"] = s.Required
		// Strict mode wants every object closed.
		out["additionalProperties"] = false
	}
	if s.Type == genai.TypeArray {
		out["items"] = jsonSchema(s.Items)
	}
	return out
}
