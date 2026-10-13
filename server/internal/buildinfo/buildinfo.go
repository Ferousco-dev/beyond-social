// Package buildinfo says which commit this binary was built from. The image
// build sets Commit with -ldflags, and /ready reports it, so a deploy can wait
// until the new release, and not the one it replaces, is the one answering.
package buildinfo

// Commit is the git commit of the build, or "dev" for a local build.
var Commit = "dev"
