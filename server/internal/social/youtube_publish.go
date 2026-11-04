package social

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// uploadURL starts a resumable upload, the form YouTube asks for any video
// that is not tiny.
const youtubeUploadURL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"

// Publish uploads a video to the connected channel. It is two requests: one to
// open the upload and describe the video, one to send the bytes.
func (p *YouTubeProvider) Publish(ctx context.Context, t Tokens, in PublishInput) (Published, error) {
	endpoint := p.uploadURL
	if endpoint == "" {
		endpoint = youtubeUploadURL
	}
	meta, err := json.Marshal(map[string]any{
		"snippet": map[string]any{"title": youtubeTitle(in.Title, in.Caption), "description": in.Caption, "categoryId": "22"},
		"status":  map[string]any{"privacyStatus": privacy(in.Visibility), "selfDeclaredMadeForKids": false},
	})
	if err != nil {
		return Published{}, err
	}
	start, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(meta))
	if err != nil {
		return Published{}, err
	}
	start.Header.Set("Authorization", "Bearer "+t.Access)
	start.Header.Set("Content-Type", "application/json; charset=UTF-8")
	start.Header.Set("X-Upload-Content-Type", in.MIME)
	start.Header.Set("X-Upload-Content-Length", fmt.Sprint(len(in.Video)))
	resp, err := p.upload().Do(start)
	if err != nil {
		return Published{}, &provider.Error{Provider: "youtube", Message: "could not reach YouTube", Transient: true, Err: err}
	}
	io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20)) //nolint:errcheck // only the headers matter
	resp.Body.Close()
	if resp.StatusCode >= 300 {
		return Published{}, youtubeRefusal(resp.StatusCode)
	}
	session := resp.Header.Get("Location")
	if !strings.HasPrefix(session, "https://") {
		return Published{}, &provider.Error{Provider: "youtube", Message: "YouTube did not open an upload"}
	}

	put, err := http.NewRequestWithContext(ctx, http.MethodPut, session, bytes.NewReader(in.Video))
	if err != nil {
		return Published{}, err
	}
	put.Header.Set("Content-Type", in.MIME)
	resp, err = p.upload().Do(put)
	if err != nil {
		// The bytes may or may not have arrived: this is the ambiguous case.
		return Published{}, &provider.Error{Provider: "youtube", Message: "the upload was interrupted", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return Published{}, youtubeRefusal(resp.StatusCode)
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.ID == "" {
		return Published{}, &provider.Error{Provider: "youtube", Message: "YouTube accepted the upload but did not say where it went", Transient: true}
	}
	return Published{ID: out.ID, URL: "https://www.youtube.com/watch?v=" + out.ID}, nil
}

// upload is a client with room for a video, which the 20 second default has not.
func (p *YouTubeProvider) upload() *http.Client {
	return &http.Client{Timeout: 5 * time.Minute, Transport: p.http.Transport}
}

func youtubeRefusal(status int) error {
	switch status {
	case http.StatusForbidden:
		return &provider.Error{Provider: "youtube", Status: status,
			Message: "YouTube refused the upload. The daily upload limit may be reached, or the app is not yet verified for public posting."}
	case http.StatusUnauthorized:
		return &provider.Error{Provider: "youtube", Status: status, Message: "YouTube no longer accepts this sign-in"}
	}
	return provider.FromHTTPStatus("youtube", status, "the upload was refused")
}

func privacy(v string) string {
	switch v {
	case "unlisted", "private":
		return v
	}
	return "public"
}

// youtubeTitle uses the title when there is one, else the start of the caption.
func youtubeTitle(title, caption string) string {
	t := strings.TrimSpace(title)
	if t == "" {
		t, _, _ = strings.Cut(strings.TrimSpace(caption), "\n")
	}
	if t == "" {
		t = "New video"
	}
	r := []rune(t)
	if len(r) > 100 {
		r = r[:100]
	}
	return string(r)
}
