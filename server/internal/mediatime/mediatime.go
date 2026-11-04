// Package mediatime reads how long an audio or video file plays from its own
// headers, without decoding it. A lip-synced video lasts as long as its voice
// recording, so this is what a talking video is priced from.
package mediatime

import (
	"bytes"
	"encoding/binary"
	"strings"
)

// Seconds returns the playing time of a file, or false when its format is not
// one read here or its headers are damaged.
func Seconds(data []byte, mimeType string) (float64, bool) {
	base, _, _ := strings.Cut(mimeType, ";")
	switch strings.ToLower(strings.TrimSpace(base)) {
	case "audio/mp4", "video/mp4", "video/quicktime":
		return mp4(data)
	case "audio/wav":
		return wav(data)
	case "audio/ogg":
		return ogg(data)
	case "audio/mpeg":
		return mp3(data)
	}
	return 0, false
}

// mp4 reads the movie header (moov/mvhd): its timescale and duration.
func mp4(data []byte) (float64, bool) {
	moov, ok := box(data, "moov")
	if !ok {
		return 0, false
	}
	mvhd, ok := box(moov, "mvhd")
	if !ok || len(mvhd) < 20 {
		return 0, false
	}
	var scale, length uint64
	if mvhd[0] == 1 {
		if len(mvhd) < 32 {
			return 0, false
		}
		scale, length = uint64(binary.BigEndian.Uint32(mvhd[20:24])), binary.BigEndian.Uint64(mvhd[24:32])
	} else {
		scale, length = uint64(binary.BigEndian.Uint32(mvhd[12:16])), uint64(binary.BigEndian.Uint32(mvhd[16:20]))
	}
	if scale == 0 {
		return 0, false
	}
	return float64(length) / float64(scale), true
}

// box returns the body of the first child box of the given type.
func box(data []byte, kind string) ([]byte, bool) {
	for len(data) >= 8 {
		size, header := uint64(binary.BigEndian.Uint32(data[:4])), uint64(8)
		switch size {
		case 0:
			size = uint64(len(data))
		case 1:
			if len(data) < 16 {
				return nil, false
			}
			size, header = binary.BigEndian.Uint64(data[8:16]), 16
		}
		if size < header || size > uint64(len(data)) {
			return nil, false
		}
		if string(data[4:8]) == kind {
			return data[header:size], true
		}
		data = data[size:]
	}
	return nil, false
}

// wav divides the sound data's size by the bytes it plays each second.
func wav(data []byte) (float64, bool) {
	if len(data) < 12 || string(data[:4]) != "RIFF" || string(data[8:12]) != "WAVE" {
		return 0, false
	}
	var byteRate uint32
	for rest := data[12:]; len(rest) >= 8; {
		id, size := string(rest[:4]), binary.LittleEndian.Uint32(rest[4:8])
		body := rest[8:]
		switch id {
		case "fmt ":
			if len(body) < 12 {
				return 0, false
			}
			byteRate = binary.LittleEndian.Uint32(body[8:12])
		case "data":
			if byteRate == 0 {
				return 0, false
			}
			return float64(min(uint64(size), uint64(len(body)))) / float64(byteRate), true
		}
		next := uint64(size) + uint64(size%2)
		if next > uint64(len(body)) {
			return 0, false
		}
		rest = body[next:]
	}
	return 0, false
}

// ogg reads the last page's position, counted in samples, and the stream's
// rate: always 48 kHz for Opus (less its pre-skip), from the header for Vorbis.
func ogg(data []byte) (float64, bool) {
	last := bytes.LastIndex(data, []byte("OggS"))
	if last < 0 || len(data) < last+14 || len(data) < 28 {
		return 0, false
	}
	granule := binary.LittleEndian.Uint64(data[last+6 : last+14])
	first := data[28:]
	switch {
	case bytes.HasPrefix(first, []byte("OpusHead")) && len(first) >= 12:
		preSkip := uint64(binary.LittleEndian.Uint16(first[10:12]))
		if granule < preSkip {
			return 0, false
		}
		return float64(granule-preSkip) / 48000, true
	case bytes.HasPrefix(first, []byte("\x01vorbis")) && len(first) >= 16:
		rate := binary.LittleEndian.Uint32(first[12:16])
		if rate == 0 {
			return 0, false
		}
		return float64(granule) / float64(rate), true
	}
	return 0, false
}

var (
	mpeg1Rates  = [16]int{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0}
	mpeg2Rates  = [16]int{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0}
	sampleRates = map[byte][3]int{3: {44100, 48000, 32000}, 2: {22050, 24000, 16000}, 0: {11025, 12000, 8000}}
)

// mp3 counts frames from a Xing/Info header when the encoder wrote one
// (variable bitrate files), and otherwise divides the size by the bitrate.
func mp3(data []byte) (float64, bool) {
	if len(data) >= 10 && string(data[:3]) == "ID3" {
		size := int(data[6]&0x7f)<<21 | int(data[7]&0x7f)<<14 | int(data[8]&0x7f)<<7 | int(data[9]&0x7f)
		if 10+size > len(data) {
			return 0, false
		}
		data = data[10+size:]
	}
	start := -1
	for i := 0; i+4 <= len(data); i++ {
		if data[i] == 0xff && data[i+1]&0xe0 == 0xe0 && data[i+1]&0x06 == 0x02 {
			start = i
			break
		}
	}
	if start < 0 {
		return 0, false
	}
	frame := data[start:]
	version := (frame[1] >> 3) & 0x03
	rates, ok := sampleRates[version]
	rateIndex, bitIndex := (frame[2]>>2)&0x03, frame[2]>>4
	if !ok || rateIndex == 3 {
		return 0, false
	}
	sampleRate := rates[rateIndex]
	samples, bitrate := 576, mpeg2Rates[bitIndex]
	if version == 3 {
		samples, bitrate = 1152, mpeg1Rates[bitIndex]
	}
	mono := frame[3]>>6 == 3
	side := map[bool]int{true: 17, false: 32}[mono]
	if version != 3 {
		side = map[bool]int{true: 9, false: 17}[mono]
	}
	if at := 4 + side; len(frame) >= at+12 {
		if tag := string(frame[at : at+4]); (tag == "Xing" || tag == "Info") && binary.BigEndian.Uint32(frame[at+4:at+8])&1 == 1 {
			frames := binary.BigEndian.Uint32(frame[at+8 : at+12])
			return float64(frames) * float64(samples) / float64(sampleRate), true
		}
	}
	if bitrate == 0 {
		return 0, false
	}
	audio := len(frame)
	if audio >= 128 && string(frame[audio-128:audio-125]) == "TAG" {
		audio -= 128
	}
	return float64(audio) * 8 / float64(bitrate*1000), true
}
