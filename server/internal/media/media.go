// Package media holds the files a user attaches to a chat: pictures, video and
// audio. Files go straight from the browser to private storage; everything
// else sees only an id and a description.
package media

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
	"github.com/google/uuid"
)

// Bucket is the private bucket attachments live in.
const Bucket = "user-media"

type Kind string

const (
	KindImage Kind = "image"
	KindVideo Kind = "video"
	KindAudio Kind = "audio"
)

// What each kind may weigh. KIE takes pictures up to 10 MB; video and audio
// are larger because the model reads them and they are never forwarded whole.
var maxBytes = map[Kind]int64{KindImage: 10 << 20, KindVideo: 100 << 20, KindAudio: 25 << 20}

var kinds = map[string]Kind{
	"image/jpeg": KindImage, "image/png": KindImage, "image/webp": KindImage,
	"video/mp4": KindVideo, "video/quicktime": KindVideo, "video/webm": KindVideo,
	"audio/mpeg": KindAudio, "audio/mp4": KindAudio, "audio/wav": KindAudio, "audio/webm": KindAudio, "audio/ogg": KindAudio,
}

var extensions = map[string]string{
	"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
	"video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
	"audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav", "audio/webm": ".weba", "audio/ogg": ".ogg",
}

var (
	ErrNotFound    = errors.New("attachment not found")
	ErrUnsupported = errors.New("that file type is not supported")
	ErrTooLarge    = errors.New("that file is too large")
	ErrNotUploaded = errors.New("the file was not uploaded")
	ErrInvalid     = errors.New("invalid attachment")
)

// MaxPerMessage is how many attachments one message may carry.
const MaxPerMessage = 4

const viewTTL = 10 * time.Minute

type Item struct {
	ID        string
	UserID    string
	Kind      Kind
	Name      string
	MIME      string
	Size      int64
	Path      string
	Ready     bool
	CreatedAt time.Time
	// SourceJobID is the job whose finished video this is a copy of, if any.
	SourceJobID string
}

// Descriptor is what a message stores and the assistant is told: what the file
// is, never where it is.
type Descriptor struct {
	ID   string `json:"id"`
	Kind Kind   `json:"kind"`
	Name string `json:"name"`
	MIME string `json:"mime_type"`
	Size int64  `json:"size_bytes"`
}

func (i Item) Descriptor() Descriptor {
	return Descriptor{ID: i.ID, Kind: i.Kind, Name: i.Name, MIME: i.MIME, Size: i.Size}
}

type Store interface {
	Create(ctx context.Context, item Item) (Item, error)
	// Get returns ErrNotFound for a file the user does not own.
	Get(ctx context.Context, userID, id string) (Item, error)
	MarkReady(ctx context.Context, id string, size int64) error
	// FindByJob returns the stored copy of a job's video, and whether there is one.
	FindByJob(ctx context.Context, userID, jobID string) (Item, bool, error)
}

type Storage interface {
	SignedUploadToken(ctx context.Context, bucket, path string) (string, error)
	Stat(ctx context.Context, bucket, path string) (storage.Info, error)
	SignedURL(ctx context.Context, bucket, path string, ttl time.Duration) (string, error)
	Upload(ctx context.Context, bucket, path, contentType string, data []byte) error
}

// Fetcher downloads a stored file through its short-lived link.
type Fetcher interface {
	Fetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, error)
}

type Service struct {
	store   Store
	storage Storage
	fetcher Fetcher
}

func NewService(store Store, st Storage, f Fetcher) *Service {
	return &Service{store: store, storage: st, fetcher: f}
}

// Slot is where the browser uploads one file.
type Slot struct {
	ID    string `json:"id"`
	Path  string `json:"path"`
	Token string `json:"token"`
}

// RequestUpload checks what the user wants to attach and issues a one-time slot
// whose path is chosen here, inside the user's own folder.
func (s *Service) RequestUpload(ctx context.Context, userID, name, mime string, size int64) (Slot, error) {
	kind, ok := kinds[strings.ToLower(mime)]
	if !ok {
		return Slot{}, ErrUnsupported
	}
	if size <= 0 || size > maxBytes[kind] {
		return Slot{}, fmt.Errorf("%w: %s files can be up to %d MB", ErrTooLarge, kind, maxBytes[kind]>>20)
	}
	name = cleanName(name)
	if name == "" {
		return Slot{}, ErrInvalid
	}
	id := uuid.NewString()
	p := userID + "/" + id + extensions[strings.ToLower(mime)]
	token, err := s.storage.SignedUploadToken(ctx, Bucket, p)
	if err != nil {
		return Slot{}, err
	}
	if _, err := s.store.Create(ctx, Item{ID: id, UserID: userID, Kind: kind, Name: name, MIME: strings.ToLower(mime), Size: size, Path: p}); err != nil {
		return Slot{}, err
	}
	return Slot{ID: id, Path: p, Token: token}, nil
}

// Confirm marks a file usable once it is seen in storage and is not larger than
// what was declared.
func (s *Service) Confirm(ctx context.Context, userID, id string) (Descriptor, error) {
	item, err := s.store.Get(ctx, userID, id)
	if err != nil {
		return Descriptor{}, err
	}
	info, err := s.storage.Stat(ctx, Bucket, item.Path)
	if errors.Is(err, storage.ErrNotFound) {
		return Descriptor{}, ErrNotUploaded
	}
	if err != nil {
		return Descriptor{}, err
	}
	if info.Size > maxBytes[item.Kind] {
		return Descriptor{}, ErrTooLarge
	}
	if info.Size > 0 {
		item.Size = info.Size
	}
	if err := s.store.MarkReady(ctx, item.ID, item.Size); err != nil {
		return Descriptor{}, err
	}
	item.Ready = true
	return item.Descriptor(), nil
}

// Resolve returns the user's usable files for a list of ids, in order, refusing
// anyone else's, unfinished uploads, and repeats.
func (s *Service) Resolve(ctx context.Context, userID string, ids []string) ([]Item, error) {
	if len(ids) > MaxPerMessage {
		return nil, fmt.Errorf("%w: at most %d attachments", ErrInvalid, MaxPerMessage)
	}
	seen := map[string]bool{}
	items := make([]Item, 0, len(ids))
	for _, id := range ids {
		if seen[id] {
			return nil, ErrInvalid
		}
		seen[id] = true
		item, err := s.store.Get(ctx, userID, id)
		if err != nil {
			return nil, err
		}
		if !item.Ready {
			return nil, ErrNotUploaded
		}
		items = append(items, item)
	}
	return items, nil
}

// ViewURL is a short-lived link for showing the user their own file.
func (s *Service) ViewURL(ctx context.Context, userID, id string) (string, error) {
	item, err := s.store.Get(ctx, userID, id)
	if err != nil {
		return "", err
	}
	if !item.Ready {
		return "", ErrNotUploaded
	}
	return s.storage.SignedURL(ctx, Bucket, item.Path, viewTTL)
}

func cleanName(raw string) string {
	name := strings.TrimSpace(path.Base(strings.ReplaceAll(raw, "\\", "/")))
	if name == "." || name == "/" {
		return ""
	}
	name = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, name)
	if utf8.RuneCountInString(name) > 120 {
		name = string([]rune(name)[:120])
	}
	return name
}

// Load returns a file's bytes and type for a model to read. It refuses anything
// larger than max rather than truncating it.
func (s *Service) Load(ctx context.Context, userID, id string, max int64) ([]byte, string, error) {
	item, err := s.store.Get(ctx, userID, id)
	if err != nil {
		return nil, "", err
	}
	if !item.Ready {
		return nil, "", ErrNotUploaded
	}
	if item.Size > max {
		return nil, "", ErrTooLarge
	}
	link, err := s.storage.SignedURL(ctx, Bucket, item.Path, viewTTL)
	if err != nil {
		return nil, "", err
	}
	data, err := s.fetcher.Fetch(ctx, link, max)
	if err != nil {
		return nil, "", err
	}
	return data, item.MIME, nil
}

// AdoptVideo copies a finished video from a provider's link into the user's own
// storage, so it keeps working after the provider's link expires and the editor
// can read it. Copying the same job twice returns the first copy.
func (s *Service) AdoptVideo(ctx context.Context, userID, jobID, sourceURL, name string) (Descriptor, error) {
	if existing, found, err := s.store.FindByJob(ctx, userID, jobID); err != nil {
		return Descriptor{}, err
	} else if found {
		return existing.Descriptor(), nil
	}
	data, err := s.fetcher.Fetch(ctx, sourceURL, maxBytes[KindVideo])
	if err != nil {
		return Descriptor{}, fmt.Errorf("%w: %v", ErrNotUploaded, err)
	}
	mime, err := safenet.SniffVideo(data)
	if err != nil {
		return Descriptor{}, ErrUnsupported
	}
	name = cleanName(name)
	if name == "" {
		name = "Video"
	}
	id := uuid.NewString()
	p := userID + "/" + id + extensions[mime]
	if err := s.storage.Upload(ctx, Bucket, p, mime, data); err != nil {
		return Descriptor{}, err
	}
	item, err := s.store.Create(ctx, Item{ID: id, UserID: userID, Kind: KindVideo, Name: name, MIME: mime, Size: int64(len(data)), Path: p, SourceJobID: jobID})
	if err != nil {
		return Descriptor{}, err
	}
	if err := s.store.MarkReady(ctx, item.ID, item.Size); err != nil {
		return Descriptor{}, err
	}
	item.Ready = true
	return item.Descriptor(), nil
}
