package media

import (
	"context"
	"fmt"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/google/uuid"
)

// AdoptAudio copies a finished audio file (a generated voiceover) from a
// provider's link into the user's own storage, so it keeps working after the
// provider's link expires and the editor can play it. Copying the same job
// twice returns the first copy.
func (s *Service) AdoptAudio(ctx context.Context, userID, jobID, sourceURL, name string) (Descriptor, error) {
	v, err, _ := s.adopting.Do(userID+"/"+jobID, func() (any, error) {
		shared, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
		defer cancel()
		if existing, found, err := s.store.FindByJob(shared, userID, jobID); err != nil {
			return nil, err
		} else if found {
			return existing.Descriptor(), nil
		}
		data, err := s.fetcher.Fetch(shared, sourceURL, maxBytes[KindAudio])
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrNotUploaded, err)
		}
		return s.StoreAudio(shared, userID, jobID, name, data)
	})
	if err != nil {
		return Descriptor{}, err
	}
	return v.(Descriptor), nil
}

// StoreAudio saves audio bytes already in hand as the user's own file. Storing
// the same job twice returns the first copy.
func (s *Service) StoreAudio(ctx context.Context, userID, jobID, name string, data []byte) (Descriptor, error) {
	if existing, found, err := s.store.FindByJob(ctx, userID, jobID); err != nil {
		return Descriptor{}, err
	} else if found {
		return existing.Descriptor(), nil
	}
	mime, err := safenet.SniffAudio(data)
	if err != nil {
		return Descriptor{}, ErrUnsupported
	}
	name = cleanName(name)
	if name == "" {
		name = "Voiceover"
	}
	id := uuid.NewString()
	p := userID + "/" + id + extensions[mime]
	if err := s.storage.Upload(ctx, Bucket, p, mime, data); err != nil {
		return Descriptor{}, err
	}
	item, err := s.store.Create(ctx, Item{ID: id, UserID: userID, Kind: KindAudio, Name: name, MIME: mime, Size: int64(len(data)), Path: p, SourceJobID: jobID})
	if err != nil {
		return Descriptor{}, err
	}
	if err := s.store.MarkReady(ctx, item.ID, item.Size); err != nil {
		return Descriptor{}, err
	}
	item.Ready = true
	return item.Descriptor(), nil
}
