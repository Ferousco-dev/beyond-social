package safenet

import (
	"bytes"
	"io"
)

func readCapped(r io.Reader, max int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > max {
		return nil, ErrTooLarge
	}
	return data, nil
}

// SniffVideo identifies the container from its leading bytes and returns the
// MIME type. The server's Content-Type is ignored: CDNs label video as
// application/octet-stream, and a hostile host can claim anything.
// Only the formats the video model accepts are recognised: MP4, QuickTime, Matroska.
func SniffVideo(data []byte) (string, error) {
	switch {
	case len(data) >= 12 && bytes.Equal(data[4:8], []byte("ftyp")):
		if bytes.HasPrefix(data[8:], []byte("qt")) {
			return "video/quicktime", nil
		}
		return "video/mp4", nil
	case len(data) >= 4 && bytes.Equal(data[:4], []byte{0x1A, 0x45, 0xDF, 0xA3}):
		return "video/x-matroska", nil
	}
	return "", ErrBadMediaType
}

// SniffAudio identifies an audio file from its leading bytes, for the same reason
// SniffVideo does: the host's label cannot be trusted. It recognises MP3 (what the
// speech model returns), WAV, Ogg and MP4 audio.
func SniffAudio(data []byte) (string, error) {
	switch {
	case len(data) >= 3 && bytes.Equal(data[:3], []byte("ID3")):
		return "audio/mpeg", nil
	case len(data) >= 2 && data[0] == 0xFF && data[1]&0xE0 == 0xE0:
		return "audio/mpeg", nil
	case len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WAVE")):
		return "audio/wav", nil
	case len(data) >= 4 && bytes.Equal(data[:4], []byte("OggS")):
		return "audio/ogg", nil
	case len(data) >= 12 && bytes.Equal(data[4:8], []byte("ftyp")):
		return "audio/mp4", nil
	}
	return "", ErrBadMediaType
}
