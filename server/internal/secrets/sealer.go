// Package secrets keeps provider credentials encrypted at rest so an admin can
// paste keys into the product instead of editing server environment variables.
package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
)

// Sealer encrypts and decrypts values with AES-256-GCM. The nonce is random per
// value and stored in front of the ciphertext.
type Sealer struct {
	aead cipher.AEAD
}

// NewSealer takes a base64 encoded 32 byte key.
func NewSealer(encodedKey string) (*Sealer, error) {
	key, err := base64.StdEncoding.DecodeString(encodedKey)
	if err != nil {
		return nil, fmt.Errorf("secrets: encryption key is not valid base64: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("secrets: encryption key must be 32 bytes, got %d", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Sealer{aead: aead}, nil
}

// Seal binds the ciphertext to name, so a stored value cannot be moved to a
// different credential row and still decrypt.
func (s *Sealer) Seal(name, plaintext string) ([]byte, error) {
	nonce := make([]byte, s.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return s.aead.Seal(nonce, nonce, []byte(plaintext), []byte(name)), nil
}

func (s *Sealer) Open(name string, sealed []byte) (string, error) {
	n := s.aead.NonceSize()
	if len(sealed) < n {
		return "", errors.New("secrets: stored value is too short")
	}
	plain, err := s.aead.Open(nil, sealed[:n], sealed[n:], []byte(name))
	if err != nil {
		return "", errors.New("secrets: stored value could not be decrypted")
	}
	return string(plain), nil
}
