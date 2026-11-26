package main

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"google.golang.org/genai"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
)

func TestTheRealKieClientFinishesAVideoAndASpeechTaskOnTheFake(t *testing.T) {
	fake := httptest.NewServer(newHandler())
	defer fake.Close()
	client := kie.NewClient("fake-key").WithBaseURLs(fake.URL+"/kie", fake.URL+"/kie-upload")
	ctx := context.Background()

	uploaded, err := client.Upload(ctx, "face.jpg", "image/jpeg", []byte("picture"))
	if err != nil || uploaded == "" {
		t.Fatalf("upload = %q, %v", uploaded, err)
	}
	for model, want := range map[string]string{"kling/ai-avatar-pro": "sample.mp4", "elevenlabs/text-to-speech-multilingual-v2": "sample.mp3"} {
		id, err := client.CreateModelTask(ctx, model, map[string]any{"prompt": "test"}, "")
		if err != nil {
			t.Fatalf("%s create: %v", model, err)
		}
		task, err := client.GetTask(ctx, id)
		if err != nil || task.State != kie.StateSuccess || len(task.ResultURLs) != 1 || task.ResultURLs[0] != mediaBase+want {
			t.Fatalf("%s task = %+v, %v", model, task, err)
		}
		file, err := safenet.NewFetcher(5*time.Second).WithTestMedia(fake.URL).Fetch(ctx, task.ResultURLs[0], 1<<20)
		if err != nil || len(file) == 0 {
			t.Fatalf("%s result could not be downloaded: %v", model, err)
		}
	}
}

func TestTheRealApifyClientReadsPostsFromTheFake(t *testing.T) {
	fake := httptest.NewServer(newHandler())
	defer fake.Close()
	client := apify.NewClient("fake-token").WithBaseURL(fake.URL + "/apify")
	ctx := context.Background()
	run, err := client.StartRun(ctx, "clockworks/tiktok-scraper", map[string]any{"q": "cake"}, apify.RunOptions{MaxItems: 6})
	if err != nil || !run.Finished() {
		t.Fatalf("run = %+v, %v", run, err)
	}
	rows, err := client.Items(ctx, run.DefaultDatasetID, 10)
	if err != nil || len(rows) != 6 {
		t.Fatalf("items = %d, %v", len(rows), err)
	}
}

func TestTheRealGeminiClientGetsJSONShapedLikeItsSchema(t *testing.T) {
	fake := httptest.NewServer(newHandler())
	defer fake.Close()
	client, err := gemini.NewClient(gemini.Config{APIKey: "fake-key", BaseURL: fake.URL + "/gemini", FallbackModel: gemini.DefaultModel})
	if err != nil {
		t.Fatal(err)
	}
	minItems := int64(2)
	schema := &genai.Schema{Type: genai.TypeObject, Required: []string{"hook", "seconds", "words"}, Properties: map[string]*genai.Schema{
		"hook":    {Type: genai.TypeString},
		"seconds": {Type: genai.TypeInteger, Minimum: genai.Ptr(5.0), Maximum: genai.Ptr(30.0)},
		"tone":    {Type: genai.TypeString, Enum: []string{"playful", "calm"}},
		"words": {Type: genai.TypeArray, MinItems: &minItems, Items: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
			"start": {Type: genai.TypeNumber}, "end": {Type: genai.TypeNumber},
		}}},
	}}
	raw, _, err := client.GenerateJSON(context.Background(), "system", "write a brief", schema)
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	var got struct {
		Hook    string `json:"hook"`
		Seconds int    `json:"seconds"`
		Tone    string `json:"tone"`
		Words   []struct{ Start, End float64 }
	}
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("not JSON: %s", raw)
	}
	if got.Hook == "" || got.Seconds < 5 || got.Seconds > 30 || got.Tone != "playful" || len(got.Words) < 2 || got.Words[1].Start <= got.Words[0].Start || got.Words[0].End <= got.Words[0].Start {
		t.Fatalf("answer does not fit the schema: %s", raw)
	}
}
