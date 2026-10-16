package elevenlabs

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func testClient(server *httptest.Server) *Client {
	return NewClientWithKey(provider.StaticKey("test-key")).WithBaseURL(server.URL)
}

func TestListVoices(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/voices" || r.Header.Get("xi-api-key") != "test-key" {
			t.Errorf("%s %s key=%q", r.Method, r.URL.Path, r.Header.Get("xi-api-key"))
		}
		_, _ = w.Write([]byte(`{"voices":[{"voice_id":"v1","name":"Ava","category":"cloned"}]}`))
	}))
	defer server.Close()

	voices, err := testClient(server).ListVoices(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(voices) != 1 || voices[0].ID != "v1" || voices[0].Name != "Ava" {
		t.Fatalf("voices = %+v", voices)
	}
}

func TestSpeakPostsTextAndReturnsAudio(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/text-to-speech/v1" {
			t.Errorf("path = %q", r.URL.Path)
		}
		_, _ = w.Write([]byte("ID3fake-mp3"))
	}))
	defer server.Close()

	audio, err := testClient(server).Speak(context.Background(), "v1", "", "Hello there")
	if err != nil {
		t.Fatalf("speak: %v", err)
	}
	if string(audio) != "ID3fake-mp3" {
		t.Fatalf("audio = %q", audio)
	}
	if _, err := testClient(server).Speak(context.Background(), "", "", "  "); err == nil {
		t.Fatal("empty voice and text must fail before any request")
	}
}

func TestAddVoiceSendsSamples(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/voices/add" {
			t.Errorf("path = %q", r.URL.Path)
		}
		reader, err := r.MultipartReader()
		if err != nil {
			t.Fatal(err)
		}
		fields := map[string]string{}
		files := 0
		for {
			part, err := reader.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				t.Fatal(err)
			}
			if part.FileName() != "" {
				files++
				continue
			}
			raw, _ := io.ReadAll(part)
			fields[part.FormName()] = string(raw)
		}
		if fields["name"] != "Feranmi" || files != 2 {
			t.Errorf("fields = %v files = %d", fields, files)
		}
		_, _ = w.Write([]byte(`{"voice_id":"clone-1","requires_verification":false}`))
	}))
	defer server.Close()

	id, err := testClient(server).AddVoice(context.Background(), "Feranmi", []Sample{
		{FileName: "a.mp3", Data: []byte("audio-a")},
		{FileName: "b.mp3", Data: []byte("audio-b")},
	})
	if err != nil || id != "clone-1" {
		t.Fatalf("id = %q err = %v", id, err)
	}
	if _, err := testClient(server).AddVoice(context.Background(), "x", []Sample{{FileName: "big.mp3", Data: make([]byte, MaxSampleBytes+1)}}); err == nil {
		t.Fatal("oversized samples must fail before upload")
	}
}

func TestDeleteVoice(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete || !strings.HasSuffix(r.URL.Path, "/v1/voices/v1") {
			t.Errorf("%s %s", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer server.Close()

	if err := testClient(server).DeleteVoice(context.Background(), "v1"); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

func TestServerErrorsAreClassified(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer server.Close()

	_, err := testClient(server).ListVoices(context.Background())
	if !provider.IsTransient(err) {
		t.Fatalf("429 must be transient: %v", err)
	}
}
