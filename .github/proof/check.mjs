// Fails a pull request whose description has no proof: an image or video in
// the "## Proof" section, or the "No visible change" box ticked.
// The body arrives in the PR_BODY environment variable, never in the command line.

export function hasProof(body) {
  const match = /##\s*Proof\s*\n([\s\S]*?)(\n##\s|$)/iu.exec(body ?? "");
  if (!match) return false;
  const section = match[1].replace(/<!--[\s\S]*?-->/gu, "");
  const media = /!\[[^\]]*\]\([^)]+\)|<img\s|<video\s|https:\/\/github\.com\/user-attachments\/assets\/|\.(png|jpe?g|gif|webp|mp4|mov|webm)\b/iu;
  const noVisibleChange = /-\s*\[x\]\s*No visible change/iu;
  return media.test(section) || noVisibleChange.test(section);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "")) {
  if (!hasProof(process.env.PR_BODY)) {
    process.stderr.write("No proof in the pull request. Add screenshots or a video under '## Proof', or tick 'No visible change'.\n");
    process.exit(1);
  }
  process.stdout.write("Proof found.\n");
}
