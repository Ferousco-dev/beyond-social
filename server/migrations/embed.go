// Package migrations embeds the versioned SQL files so the binary carries its
// own schema and does not depend on the working directory at startup.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
