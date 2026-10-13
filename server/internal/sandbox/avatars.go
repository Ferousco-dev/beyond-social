package sandbox

import (
	"fmt"
	"io"
	"net/http"
)

type avatar struct {
	group, look string
	consent     bool
}

const voiceID = "sandbox-voice-1"

var voices = []map[string]string{
	{"voice_id": voiceID, "name": "Sandbox Amara", "language": "English", "gender": "female", "type": "private"},
	{"voice_id": "sandbox-voice-2", "name": "Sandbox Tunde", "language": "English", "gender": "male", "type": "public"},
	{"voice_id": "sandbox-voice-3", "name": "Sandbox Wei", "language": "English", "gender": "male", "type": "public"},
}

// mountAvatars fakes HeyGen. An avatar waits for consent (a page the person
// opens), then trains for a couple of polls, then is ready with a voice.
func (s *Server) mountAvatars(mux *http.ServeMux) {
	mux.HandleFunc("POST /heygen/avatars", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, io.LimitReader(r.Body, 1<<20))
		a := &avatar{group: id("grp"), look: id("look")}
		s.mu.Lock()
		s.avatars[a.group], s.avatars[a.look] = a, a
		s.mu.Unlock()
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{
			"avatar_item":  map[string]any{"id": a.look, "status": "processing"},
			"avatar_group": map[string]any{"id": a.group, "status": "pending_consent", "consent_status": "pending"},
		}})
	})
	mux.HandleFunc("GET /heygen/avatars/looks/{id}", func(w http.ResponseWriter, r *http.Request) {
		a := s.avatar(r.PathValue("id"))
		if a == nil {
			notFound(w)
			return
		}
		status, _ := s.avatarState(a)
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"id": a.look, "status": status, "default_voice_id": voiceFor(status)}})
	})
	mux.HandleFunc("GET /heygen/avatars/{id}", func(w http.ResponseWriter, r *http.Request) {
		a := s.avatar(r.PathValue("id"))
		if a == nil {
			notFound(w)
			return
		}
		status, consent := s.avatarState(a)
		data := map[string]any{"id": a.group, "status": status, "consent_status": consent, "default_voice_id": voiceFor(status)}
		if status == "completed" {
			data["preview_image_url"], data["preview_video_url"] = s.Base+"/files/frame.png", s.Base+"/files/clip.mp4"
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": data})
	})
	mux.HandleFunc("POST /heygen/avatars/{id}/consent", func(w http.ResponseWriter, r *http.Request) {
		if s.avatar(r.PathValue("id")) == nil {
			notFound(w)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"url": s.Base + "/heygen/consent/" + r.PathValue("id")}})
	})
	mux.HandleFunc("GET /heygen/consent/{id}", func(w http.ResponseWriter, r *http.Request) {
		a := s.avatar(r.PathValue("id"))
		if a == nil {
			notFound(w)
			return
		}
		s.mu.Lock()
		a.consent = true
		s.mu.Unlock()
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, `<!doctype html><meta charset="utf-8"><title>Sandbox consent</title><body style="font-family:system-ui;padding:3rem"><h1>Consent recorded</h1><p>This is the sandbox. You can close this tab and return to the app.</p>`)
	})
	mux.HandleFunc("DELETE /heygen/avatars/{id}", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	mux.HandleFunc("DELETE /heygen/voices/{id}", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

	mux.HandleFunc("GET /heygen/voices", func(w http.ResponseWriter, r *http.Request) {
		want := r.URL.Query().Get("type")
		out := []map[string]string{}
		for _, v := range voices {
			if want == "" || v["type"] == want {
				out = append(out, v)
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": out, "has_more": false})
	})
	mux.HandleFunc("GET /heygen/voices/{id}", func(w http.ResponseWriter, r *http.Request) {
		for _, v := range voices {
			if v["voice_id"] == r.PathValue("id") {
				writeJSON(w, http.StatusOK, map[string]any{"data": v})
				return
			}
		}
		notFound(w)
	})

	mux.HandleFunc("POST /heygen/videos", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, io.LimitReader(r.Body, 1<<20))
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"video_id": id("vid")}})
	})
	mux.HandleFunc("GET /heygen/videos/{id}", func(w http.ResponseWriter, r *http.Request) {
		vid := r.PathValue("id")
		data := map[string]any{"id": vid, "status": "processing"}
		if s.poll("heygen:"+vid) > 1 {
			data = map[string]any{"id": vid, "status": "completed", "video_url": s.Base + "/files/clip.mp4", "thumbnail_url": s.Base + "/files/frame.png", "duration": 3.0}
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": data})
	})
}

func (s *Server) avatar(key string) *avatar {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.avatars[key]
}

// avatarState is where training is: waiting for consent, then two polls of
// processing, then done.
func (s *Server) avatarState(a *avatar) (status, consent string) {
	s.mu.Lock()
	given := a.consent
	s.mu.Unlock()
	if !given {
		return "pending_consent", "pending"
	}
	if s.poll("train:"+a.group) <= 2 {
		return "processing", "accepted"
	}
	return "completed", "accepted"
}

func voiceFor(status string) string {
	if status == "completed" {
		return voiceID
	}
	return ""
}
