package sandbox

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"io"
	"time"
)

var startTime = time.Now()

func bytesReader(b []byte) io.ReadSeeker { return bytes.NewReader(b) }

// id makes a short identifier with a readable prefix.
func id(prefix string) string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}
