# Outbound bandwidth

Render meters what the API server sends out, not what it receives. In November 2026 the
Hobby workspace used 5.37 GB of its 5 GB: 5.37 GB "service-initiated" and 4 MB of HTTP
responses. People loading pages is not the cost. The server pushing files is.

## Where the server sends large files out

| Where | What is sent | How often | Status |
|---|---|---|---|
| `media.StoreVideo` (adopt a finished clip, linked-video analysis) | the whole video to Supabase storage | once per clip or per analysis; adopting the same job twice returns the first copy | Needed. A 3-minute video is about 12 clips, so about 250 to 600 MB. |
| `kietools` and `generate` builders | the face, voice or starting picture to KIE | once per job, so once per clip of a long video | Fixed: `kie.UploadCache` sends identical bytes once a day. |
| `transform/submit.go` | the source video to KIE | once per transformation | Needed; capped at 10 MB by `kie.MaxInputBytes`. |
| `publish.prepare` | the video copied into storage for a scheduled post | once per post | Possible saving: skip the copy when the source is already in our own storage. |
| TikTok and YouTube publishers | the video to each platform | once per platform per post | Needed. |
| `analysis` and Gemini calls | video bytes inline to Gemini | once per analysis | Linked videos go by URL when the platform allows; otherwise the bytes are sent. |

## What reading a file costs

Files shown to people are signed Supabase URLs, so browsers download them straight from
Supabase and Render sends nothing. Keep it that way: never proxy a file through the API.

## Rules for new code

- Never stream a user's file through the API to the browser. Hand out a signed URL.
- Host a file at a provider through `kie.UploadCache`, not the raw client.
- Count a long video as many clips: every per-clip upload is multiplied by up to 12.
