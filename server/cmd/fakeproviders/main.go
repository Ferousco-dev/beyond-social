// Command fakeproviders stands in for kie.ai, Apify and Gemini in the
// end-to-end test stack, so every flow can run in CI without generating,
// scraping or paying for anything. The API is pointed here by
// E2E_FAKE_PROVIDERS, which production refuses to start with.
//
// Generated files are answered as https://media.e2e.test/media/..., an address
// only the test stack's fetcher can reach (see safenet.TestMediaHost).
package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

//go:embed media
var media embed.FS

const mediaBase = "https://media.e2e.test/media/"

func main() {
	addr := flag.String("addr", "127.0.0.1:8090", "address to listen on")
	flag.Parse()
	slog.Info("fake providers listening", "addr", *addr)
	server := &http.Server{Addr: *addr, Handler: newHandler(), ReadHeaderTimeout: 10 * time.Second}
	if err := server.ListenAndServe(); err != nil {
		slog.Error("fake providers stopped", "error", err)
		os.Exit(1)
	}
}

type fakes struct {
	next  atomic.Int64
	mu    sync.Mutex
	tasks map[string]string
	calls map[string]int
}

func newHandler() http.Handler {
	f := &fakes{tasks: map[string]string{}, calls: map[string]int{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, map[string]any{"ok": true}) })
	mux.HandleFunc("GET /calls", f.listCalls)
	mux.Handle("GET /media/", http.FileServerFS(media))
	mux.HandleFunc("POST /kie-upload/api/file-stream-upload", f.kieUpload)
	mux.HandleFunc("POST /kie/api/v1/jobs/createTask", f.kieCreate)
	mux.HandleFunc("GET /kie/api/v1/jobs/recordInfo", f.kieRecord)
	mux.HandleFunc("POST /apify/actors/{actor}/runs", f.apifyRun)
	mux.HandleFunc("GET /apify/actor-runs/{run}", f.apifyRun)
	mux.HandleFunc("GET /apify/datasets/{dataset}/items", f.apifyItems)
	mux.HandleFunc("POST /gemini/", f.gemini)
	return mux
}

func (f *fakes) count(name string) {
	f.mu.Lock()
	f.calls[name]++
	f.mu.Unlock()
}

// listCalls lets a test prove a provider was asked, without any real one being involved.
func (f *fakes) listCalls(w http.ResponseWriter, _ *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	writeJSON(w, f.calls)
}

func (f *fakes) id(prefix string) string { return fmt.Sprintf("%s-%d", prefix, f.next.Add(1)) }

func (f *fakes) kieUpload(w http.ResponseWriter, r *http.Request) {
	f.count("kie.upload")
	_, _ = io.Copy(io.Discard, io.LimitReader(r.Body, 64<<20))
	writeJSON(w, map[string]any{"success": true, "code": 200, "msg": "ok", "data": map[string]any{"downloadUrl": mediaBase + "sample.jpg"}})
}

func (f *fakes) kieCreate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Model string `json:"model"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body)
	f.count("kie.task:" + body.Model)
	task := f.id("task")
	f.mu.Lock()
	f.tasks[task] = body.Model
	f.mu.Unlock()
	writeJSON(w, map[string]any{"code": 200, "msg": "success", "data": map[string]any{"taskId": task}})
}

// kieRecord answers every task as finished, with a sound for speech models and a video for the rest.
func (f *fakes) kieRecord(w http.ResponseWriter, r *http.Request) {
	task := r.URL.Query().Get("taskId")
	f.mu.Lock()
	model, known := f.tasks[task]
	f.mu.Unlock()
	if !known {
		writeJSON(w, map[string]any{"code": 404, "msg": "task not found"})
		return
	}
	file := "sample.mp4"
	if strings.Contains(model, "speech") {
		file = "sample.mp3"
	}
	result, _ := json.Marshal(map[string]any{"resultUrls": []string{mediaBase + file}})
	writeJSON(w, map[string]any{"code": 200, "msg": "success", "data": map[string]any{
		"taskId": task, "state": "success", "progress": 100, "resultJson": string(result),
	}})
}

func (f *fakes) apifyRun(w http.ResponseWriter, r *http.Request) {
	f.count("apify.run")
	writeJSON(w, map[string]any{"data": map[string]any{"id": "run-1", "status": "SUCCEEDED", "defaultDatasetId": "dataset-1"}})
}

// apifyItems returns posts that read as both a TikTok and an Instagram row, so either search works.
func (f *fakes) apifyItems(w http.ResponseWriter, _ *http.Request) {
	rows := make([]map[string]any, 0, 6)
	for i := 1; i <= 6; i++ {
		views, likes := int64(10000*i), int64(900*i)
		seconds := 15.0
		rows = append(rows, map[string]any{
			"id": fmt.Sprintf("post-%d", i), "text": fmt.Sprintf("Test post %d about baking #cake", i),
			"webVideoUrl":   fmt.Sprintf("https://www.tiktok.com/@baker/video/10000000000000000%02d", i),
			"createTimeISO": time.Now().Add(-time.Duration(i) * time.Hour).UTC().Format(time.RFC3339),
			"playCount":     views, "diggCount": likes, "commentCount": int64(40 * i), "shareCount": int64(10 * i),
			"authorMeta": map[string]any{"name": "baker", "nickName": "Test Baker"},
			"videoMeta":  map[string]any{"duration": seconds, "coverUrl": mediaBase + "sample.jpg", "downloadAddr": mediaBase + "sample.mp4"},
			"hashtags":   []map[string]any{{"name": "cake"}},
			"shortCode":  fmt.Sprintf("TEST%d", i), "url": fmt.Sprintf("https://www.instagram.com/reel/TEST%d/", i),
			"caption": fmt.Sprintf("Test reel %d about baking", i), "type": "Video", "ownerUsername": "baker", "ownerFullName": "Test Baker",
			"displayUrl": mediaBase + "sample.jpg", "videoUrl": mediaBase + "sample.mp4", "videoDuration": seconds,
			"videoViewCount": views, "videoPlayCount": views, "likesCount": likes, "commentsCount": int64(40 * i),
			"timestamp": time.Now().Add(-time.Duration(i) * time.Hour).UTC().Format(time.RFC3339),
		})
	}
	writeJSON(w, rows)
}

// gemini answers generateContent with JSON built from the schema the caller asked for,
// so every AI feature gets a well-formed answer without the fake knowing about it.
func (f *fakes) gemini(w http.ResponseWriter, r *http.Request) {
	f.count("gemini")
	var body struct {
		GenerationConfig struct {
			ResponseSchema     map[string]any `json:"responseSchema"`
			ResponseJSONSchema map[string]any `json:"responseJsonSchema"`
		} `json:"generationConfig"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 32<<20)).Decode(&body)
	schema := body.GenerationConfig.ResponseSchema
	if schema == nil {
		schema = body.GenerationConfig.ResponseJSONSchema
	}
	var answer any = "This is a test answer."
	if schema != nil {
		answer = instance(schema, "answer", 0)
	}
	text, _ := json.Marshal(answer)
	if s, ok := answer.(string); ok && schema == nil {
		text = []byte(s)
	}
	writeJSON(w, map[string]any{
		"candidates":    []any{map[string]any{"content": map[string]any{"role": "model", "parts": []any{map[string]any{"text": string(text)}}}, "finishReason": "STOP"}},
		"usageMetadata": map[string]any{"promptTokenCount": 10, "candidatesTokenCount": 20, "totalTokenCount": 30},
		"modelVersion":  "fake",
	})
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(value)
}
