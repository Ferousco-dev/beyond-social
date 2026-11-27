// Package look turns the style and setting a person picks into words that
// keep a generated video looking filmed rather than AI-made.
//
// The form offers looks such as "Cinematic" and "Minimal studio" and settings
// such as "Studio". Sent to a video model as they are, those words pull it
// toward graded colour, studio light and glossy skin, which is the look people
// call AI. Each one is translated here into what a phone would really capture
// in that mood, so the mood survives and the polish does not.
package look

import "strings"

// styles maps each look on the form to what a phone would capture in that mood.
var styles = map[string]string{
	"bright and clean":     "Bright daylight from a big window in a tidy real room, true-to-life colours, everything in sharp everyday focus.",
	"cinematic":            "Moody but real: low evening light from lamps and windows, deep natural shadows, a slow steady handheld phone camera, true-to-life colour with no film grading.",
	"handheld, ugc feel":   "Filmed by hand on a phone like a creator's own clip: casual framing, small shakes, the camera reframing as people move.",
	"minimal studio":       "A plain wall in a real room or small shop, soft daylight from one side and little else in frame; not a photo studio.",
	"warm and natural":     "Warm late-afternoon light through a window, relaxed and homely, colours as the eye sees them.",
	"bold and high energy": "Quick handheld moves and the bright real colours of the place itself; lively but real, no neon, no flashing effects.",
}

// settings maps settings that invite a produced look to a real place.
var settings = map[string]string{
	"studio": "a small real studio or spare room with a plain wall and everyday clutter just out of frame",
}

// Style returns the filmed-reality wording for a look, or the look unchanged
// when it is not one of ours (the person typed their own).
func Style(name string) string {
	if real, ok := styles[normalise(name)]; ok {
		return real
	}
	return strings.TrimSpace(name)
}

// Setting returns a real-place wording for a setting, or the setting unchanged.
func Setting(name string) string {
	if real, ok := settings[normalise(name)]; ok {
		return real
	}
	return strings.TrimSpace(name)
}

// Brief rewrites a video brief line by line: a line that is only a look
// becomes its filmed wording, and "Setting: X" gets a real place. Every other
// line, including the words to be spoken, is kept exactly.
func Brief(brief string) string {
	lines := strings.Split(brief, "\n")
	for i, line := range lines {
		lines[i] = rewrite(line)
	}
	return strings.Join(lines, "\n")
}

// Direction rewrites an avatar direction, whose parts are joined with ". ". The
// avatar keeps the background of its photo, so any setting is dropped.
func Direction(direction string) string {
	parts := strings.Split(direction, ". ")
	kept := parts[:0]
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if strings.HasPrefix(strings.ToLower(trimmed), "setting:") {
			continue
		}
		kept = append(kept, strings.TrimSuffix(rewrite(trimmed), "."))
	}
	return strings.Join(kept, ". ")
}

func rewrite(line string) string {
	trimmed := strings.TrimSpace(line)
	if real, ok := styles[normalise(trimmed)]; ok {
		return real
	}
	if value, found := cutPrefixFold(trimmed, "setting:"); found {
		return "Setting: " + Setting(value)
	}
	return line
}

func normalise(s string) string {
	return strings.ToLower(strings.TrimSuffix(strings.TrimSpace(s), "."))
}

// cutPrefixFold is strings.CutPrefix that ignores case.
func cutPrefixFold(s, prefix string) (string, bool) {
	if len(s) < len(prefix) || !strings.EqualFold(s[:len(prefix)], prefix) {
		return s, false
	}
	return strings.TrimSpace(s[len(prefix):]), true
}
