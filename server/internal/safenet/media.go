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
