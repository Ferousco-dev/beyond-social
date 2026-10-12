package httpserver

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
)

const maxJSONBody = 8 << 10

// decodeJSON reads a small, strict JSON body: unknown fields and trailing data
// are errors, so typos in a request fail loudly instead of being ignored.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxJSONBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "request_too_large", "request body is too large")
		} else {
			writeError(w, http.StatusBadRequest, "invalid_request", "request body must be valid JSON with only the documented fields")
		}
		return false
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid_request", "request body must contain a single JSON object")
		return false
	}
	return true
}

func intParam(r *http.Request, name string, fallback, min, max int) (int, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < min || value > max {
		return 0, errors.New(name + " must be an integer between " + strconv.Itoa(min) + " and " + strconv.Itoa(max))
	}
	return value, nil
}

// pageParams reads limit and offset, writing a 400 itself when they are bad.
func pageParams(w http.ResponseWriter, r *http.Request) (limit, offset int, ok bool) {
	limit, err := intParam(r, "limit", defaultPageSize, 1, maxPageSize)
	if err == nil {
		offset, err = intParam(r, "offset", 0, 0, 1_000_000)
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return 0, 0, false
	}
	return limit, offset, true
}
