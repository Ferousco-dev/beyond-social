package sandbox

import (
	"io"
	"net/http"
	"net/url"
	"sync"
)

// Posted records what the fake platforms received, for tests and for looking at.
type Posted struct {
	Platform string
	Bytes    int
	Caption  string
}

var (
	postedMu sync.Mutex
	posted   []Posted
)

// PostedVideos lists everything the fake platforms have been sent.
func PostedVideos() []Posted {
	postedMu.Lock()
	defer postedMu.Unlock()
	return append([]Posted(nil), posted...)
}

func record(p Posted) {
	postedMu.Lock()
	defer postedMu.Unlock()
	posted = append(posted, p)
}

// mountSocial fakes the three platforms: sign-in that approves at once, an
// account to show, and an upload that is accepted and remembered.
func (s *Server) mountSocial(mux *http.ServeMux) {
	approve := func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		target, err := url.Parse(q.Get("redirect_uri"))
		if err != nil || target.Host == "" {
			http.Error(w, "sandbox: missing redirect_uri", http.StatusBadRequest)
			return
		}
		v := target.Query()
		v.Set("code", "sandbox-code")
		v.Set("state", q.Get("state"))
		target.RawQuery = v.Encode()
		http.Redirect(w, r, target.String(), http.StatusFound)
	}
	token := map[string]any{"access_token": "sbx-access", "refresh_token": "sbx-refresh", "expires_in": 3600, "scope": "sandbox", "open_id": "sbx-open-id"}
	tokenHandler := func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, http.StatusOK, token) }
	ok := func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, http.StatusOK, map[string]any{}) }

	for _, p := range []string{"/social/google/auth", "/social/tiktok/auth", "/social/instagram/dialog"} {
		mux.HandleFunc("GET "+p, approve)
	}
	mux.HandleFunc("POST /social/google/token", tokenHandler)
	mux.HandleFunc("POST /social/tiktok/token", tokenHandler)
	mux.HandleFunc("POST /social/google/revoke", ok)
	mux.HandleFunc("POST /social/tiktok/revoke", ok)

	mux.HandleFunc("GET /social/youtube/channels", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"items": []any{map[string]any{"id": "UCsandbox", "snippet": map[string]string{"title": "Sandbox channel"}}}})
	})
	mux.HandleFunc("POST /social/youtube/upload", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Location", s.Base+"/social/youtube/session/"+id("yt"))
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("PUT /social/youtube/session/{id}", func(w http.ResponseWriter, r *http.Request) {
		n, _ := io.Copy(io.Discard, r.Body)
		record(Posted{Platform: "youtube", Bytes: int(n)})
		writeJSON(w, http.StatusOK, map[string]string{"id": "sbx" + r.PathValue("id")})
	})

	mux.HandleFunc("GET /social/tiktok/user", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"user": map[string]string{"display_name": "Sandbox TikTok"}}})
	})
	mux.HandleFunc("POST /social/tiktok/init", func(w http.ResponseWriter, _ *http.Request) {
		publish := id("tt")
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"publish_id": publish, "upload_url": s.Base + "/social/tiktok/upload/" + publish}, "error": map[string]string{"code": "ok"}})
	})
	mux.HandleFunc("PUT /social/tiktok/upload/{id}", func(w http.ResponseWriter, r *http.Request) {
		n, _ := io.Copy(io.Discard, r.Body)
		record(Posted{Platform: "tiktok", Bytes: int(n)})
		ok(w, r)
	})

	g := "/social/instagram/graph"
	mux.HandleFunc("GET "+g+"/oauth/access_token", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"access_token": "sbx-access", "expires_in": 5184000})
	})
	mux.HandleFunc("GET "+g+"/me/accounts", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"data": []any{map[string]any{"instagram_business_account": map[string]string{"id": "17841sandbox", "username": "sandbox_ig"}}}})
	})
	mux.HandleFunc("DELETE "+g+"/me/permissions", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	})
	mux.HandleFunc("POST "+g+"/{account}/media", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		record(Posted{Platform: "instagram", Caption: r.PostForm.Get("caption")})
		writeJSON(w, http.StatusOK, map[string]string{"id": id("ig_container")})
	})
	mux.HandleFunc("POST "+g+"/{account}/media_publish", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"id": id("ig_media")})
	})
	mux.HandleFunc("GET "+g+"/{object}", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("fields") == "permalink" {
			writeJSON(w, http.StatusOK, map[string]string{"permalink": "https://www.instagram.com/reel/sandbox/"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status_code": "FINISHED"})
	})
}
