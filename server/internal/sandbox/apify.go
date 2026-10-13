package sandbox

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// mountApify fakes the trend scraper: a run finishes at once and its dataset
// holds a handful of videos for the platform the actor is for.
func (s *Server) mountApify(mux *http.ServeMux) {
	mux.HandleFunc("POST /apify/actors/{actor}/runs", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, io.LimitReader(r.Body, 1<<20))
		platform := "instagram"
		if strings.Contains(r.PathValue("actor"), "tiktok") {
			platform = "tiktok"
		}
		run := id("run")
		s.mu.Lock()
		s.polls["dataset:"+run] = 0
		s.mu.Unlock()
		writeJSON(w, http.StatusCreated, map[string]any{"data": runBody(run, platform)})
	})
	mux.HandleFunc("GET /apify/actor-runs/{id}", func(w http.ResponseWriter, r *http.Request) {
		platform := "tiktok"
		if strings.HasPrefix(r.PathValue("id"), "run_i") {
			platform = "instagram"
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": runBody(r.PathValue("id"), platform)})
	})
	mux.HandleFunc("GET /apify/datasets/{id}/items", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.PathValue("id"), "ds_instagram") {
			writeJSON(w, http.StatusOK, s.instagramRows())
			return
		}
		writeJSON(w, http.StatusOK, s.tiktokRows())
	})
}

func runBody(run, platform string) map[string]string {
	return map[string]string{"id": run, "status": "SUCCEEDED", "defaultDatasetId": "ds_" + platform + "_" + run}
}

var topics = []string{"morning routine", "street food tour", "budget travel tips", "startup lessons", "quick workout", "cooking hack", "study with me", "product review"}

func (s *Server) tiktokRows() []map[string]any {
	rows := make([]map[string]any, 0, len(topics))
	for i, topic := range topics {
		code := fmt.Sprintf("73000000000000000%02d", i)
		rows = append(rows, map[string]any{
			"id": code, "text": "Sandbox: " + topic + " #sandbox", "webVideoUrl": "https://www.tiktok.com/@sandbox" + fmt.Sprint(i) + "/video/" + code,
			"createTimeISO": time.Now().Add(-time.Duration(i+1) * 24 * time.Hour).UTC().Format(time.RFC3339),
			"playCount":     120000 - i*9000, "diggCount": 9000 - i*500, "commentCount": 300 + i, "shareCount": 150 + i,
			"mediaUrls":  []string{s.Base + "/files/clip.mp4"},
			"authorMeta": map[string]string{"name": fmt.Sprintf("sandbox%d", i), "nickName": "Sandbox creator " + fmt.Sprint(i)},
			"videoMeta":  map[string]any{"duration": 3.0, "coverUrl": s.Base + "/files/frame.png"},
			"hashtags":   []map[string]string{{"name": "sandbox"}},
		})
	}
	return rows
}

func (s *Server) instagramRows() []map[string]any {
	rows := make([]map[string]any, 0, len(topics))
	for i, topic := range topics {
		code := fmt.Sprintf("SBX%02dabc", i)
		rows = append(rows, map[string]any{
			"id": code, "shortCode": code, "url": "https://www.instagram.com/reel/" + code + "/", "caption": "Sandbox: " + topic,
			"type": "Video", "ownerUsername": fmt.Sprintf("sandbox%d", i), "ownerFullName": "Sandbox creator " + fmt.Sprint(i),
			"displayUrl": s.Base + "/files/frame.png", "videoUrl": s.Base + "/files/clip.mp4", "videoDuration": 3.0,
			"videoPlayCount": 80000 - i*5000, "likesCount": 6000 - i*300, "commentsCount": 200 + i,
			"timestamp": time.Now().Add(-time.Duration(i+1) * 24 * time.Hour).UTC().Format(time.RFC3339), "hashtags": []string{"sandbox"},
		})
	}
	return rows
}
