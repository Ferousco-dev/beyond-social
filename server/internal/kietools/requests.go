package kietools

import "strings"

// Edit is a picture change: a description and the pictures it applies to.
type Edit struct {
	Prompt      string
	Pictures    []source
	AspectRatio string
}

func ParseEdit(args map[string]any) (Edit, error) {
	if err := checkArgs(args, "prompt", "image_media_ids", "image_urls", "aspect_ratio"); err != nil {
		return Edit{}, err
	}
	var e Edit
	var err error
	if e.Prompt, err = text(args, "prompt", MaxPromptRunes, true); err != nil {
		return Edit{}, err
	}
	ids, _ := args["image_media_ids"].([]any)
	for _, raw := range ids {
		id, _ := raw.(string)
		s, err := readSource(map[string]any{"i": id}, "i", "u")
		if err != nil || s.empty() {
			return Edit{}, invalid("a picture id is not valid")
		}
		e.Pictures = append(e.Pictures, s)
	}
	links, _ := args["image_urls"].([]any)
	for _, raw := range links {
		link, _ := raw.(string)
		s, err := readSource(map[string]any{"u": link}, "i", "u")
		if err != nil || s.empty() {
			return Edit{}, invalid("a picture link is not valid")
		}
		e.Pictures = append(e.Pictures, s)
	}
	if len(e.Pictures) == 0 || len(e.Pictures) > MaxPictures {
		return Edit{}, invalid("an edit needs 1 to %d pictures", MaxPictures)
	}
	if e.AspectRatio, err = text(args, "aspect_ratio", 8, false); err != nil || (e.AspectRatio != "" && !aspectRatios[e.AspectRatio]) {
		return Edit{}, invalid("unsupported aspect ratio")
	}
	return e, nil
}

// Talk is a picture and a voice recording that become one talking video.
type Talk struct {
	Image, Audio source
	Prompt       string
	// Seconds is how long the voice runs. It is what the video is charged for.
	Seconds int
}

func ParseTalk(args map[string]any) (Talk, error) {
	if err := checkArgs(args, "image_media_id", "image_url", "audio_media_id", "audio_url", "prompt", "seconds"); err != nil {
		return Talk{}, err
	}
	var t Talk
	var err error
	if t.Image, err = readSource(args, "image_media_id", "image_url"); err != nil || t.Image.empty() {
		return Talk{}, invalid("a picture is required")
	}
	if t.Audio, err = readSource(args, "audio_media_id", "audio_url"); err != nil || t.Audio.empty() {
		return Talk{}, invalid("a voice recording is required")
	}
	if t.Prompt, err = text(args, "prompt", MaxPromptRunes, true); err != nil {
		return Talk{}, err
	}
	n, ok := args["seconds"].(float64)
	if !ok || n != float64(int(n)) || int(n) < MinTalkSeconds || int(n) > MaxTalkSeconds {
		return Talk{}, invalid("seconds must be a whole number from %d to %d", MinTalkSeconds, MaxTalkSeconds)
	}
	t.Seconds = int(n)
	return t, nil
}

// Speech is text read aloud in one of KIE's ready-made voices.
type Speech struct {
	Text  string
	Voice string
}

func ParseSpeech(args map[string]any) (Speech, error) {
	if err := checkArgs(args, "text", "voice"); err != nil {
		return Speech{}, err
	}
	var s Speech
	var err error
	if s.Text, err = text(args, "text", MaxSpeechRunes, true); err != nil {
		return Speech{}, err
	}
	if s.Voice, err = text(args, "voice", 40, false); err != nil || strings.ContainsAny(s.Voice, " /\\") {
		return Speech{}, invalid("voice is not valid")
	}
	return s, nil
}
