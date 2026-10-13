package sandbox

import (
	"encoding/json"
	"io"
	"net/http"
)

// mountVideo fakes KIE: a file upload, then generation tasks that look busy
// once and then finish with the sample clip.
func (s *Server) mountVideo(mux *http.ServeMux) {
	mux.HandleFunc("POST /kie/api/file-stream-upload", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, io.LimitReader(r.Body, 64<<20))
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "code": 200, "msg": "ok", "data": map[string]string{"downloadUrl": s.Base + "/files/clip.mp4"}})
	})
	mux.HandleFunc("POST /kie/api/v1/jobs/createTask", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Model string `json:"model"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body)
		writeJSON(w, http.StatusOK, map[string]any{"code": 200, "msg": "success", "data": map[string]string{"taskId": id("kie")}})
	})
	mux.HandleFunc("GET /kie/api/v1/chat/credit", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"code": 200, "msg": "success", "data": 2500})
	})
	mux.HandleFunc("GET /kie/api/v1/jobs/recordInfo", func(w http.ResponseWriter, r *http.Request) {
		task := r.URL.Query().Get("taskId")
		data := map[string]any{"taskId": task, "state": "generating", "progress": 50}
		if s.poll("kie:"+task) > 1 {
			result, _ := json.Marshal(map[string]any{"resultUrls": []string{s.Base + "/files/clip.mp4"}})
			data = map[string]any{"taskId": task, "state": "success", "progress": 100, "resultJson": string(result)}
		}
		writeJSON(w, http.StatusOK, map[string]any{"code": 200, "msg": "success", "data": data})
	})
}
