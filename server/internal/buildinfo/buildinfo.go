// Package buildinfo says which commit this binary was built from. The image
// build sets Commit with -ldflags, and /ready reports it, so a deploy can wait
// until the new release, and not the one it replaces, is the one answering.
package buildinfo

import "os"

// Commit is the git commit of the build, or "dev" for a local build.
var Commit = "dev"

// init falls back to the commit Render names at run time when the build could
// not bake one in (a Docker build given no COMMIT argument).
func init() {
	if Commit == "dev" || Commit == "unknown" || Commit == "" {
		if c := os.Getenv("RENDER_GIT_COMMIT"); c != "" {
			Commit = c
		}
	}
}
