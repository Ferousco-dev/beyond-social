# Long videos (up to 3 minutes): Plan C

Working notes, written as the work is done. Started 19 Nov 2026.

## The problem

The video model (Kling 3.0 on kie.ai) renders at most 15 seconds per request. We want videos of up to 3 minutes, and the person chooses the length (anything from 15 seconds to 3 minutes).

## What existed before this work

Commit `1c85132` (17 Nov) already made a long video as a batch of up to 12 independent clips of at most 15 seconds, rendered three at a time and joined on the timeline. Its weaknesses:

1. The clips do not match each other. Nothing carries a person, place or product from one clip to the next.
2. Each clip invents its own voice when sound is on, so the voice changes every 15 seconds.
3. The script was shared out by sentence count. Choosing a different length never wrote new content, and there was no page to see or edit the plan.
4. A picture attached as the first frame was used as the first frame of every clip.
5. The script screen (Discover, then Approve script) hid the long lengths and snapped every choice back to 15 seconds, so "Pick 30s, Use 30s" did nothing. Fixed on 19 Nov.
6. Cost: about $13 to $21 of provider cost for 3 minutes (see Cost). Nobody has rendered a long video yet.

## The decision: edit it like a real social video

Long social videos are not one long take. They are many cuts. So a long video is planned as 20 to 40 short shots (3 to 8 seconds), with:

- one storyboard written for the exact length the person chose, shown on a page where every shot can be edited before anything is rendered;
- one shared "look" description (people, place, style) repeated in every shot;
- one continuous voiceover for the whole video, made as speech (ElevenLabs through kie.ai, already in the product) instead of the video model inventing a different voice in every clip;
- shots rendered silent in the background, each one landing on the timeline as soon as it is ready;
- last frame to first frame chaining and reference images only where shots must look continuous.

Talking-head videos (a person speaking to camera) keep using the existing HeyGen path, which supports up to 10 minutes natively.

## Build order

| Step | What | State (19 Nov) |
| --- | --- | --- |
| 0 | Fix the script screen so 30s to 3 min can be chosen | Done, not seen in a browser |
| 1 | Storyboard written for the chosen length, shown and editable, rendered from | Built, not seen in a browser, never run against the live model |
| 2 | One voiceover for the whole video, shots rendered silent | Built, not seen in a browser, never run against the live speech model |
| 3 | Render engine: shots land on the timeline as they finish, retry per shot | Not started |
| 4 | Continuity: last frame to next first frame, reference images | Not started, needs one approved test render |
| 5 | Cost, plan limits and time estimates shown before approving | Not started |

## Step 1, as built

Server:
- `server/internal/storyboard`: the plan type, the Gemini prompt, strict checking of the model's answer, and `Fit`, which makes the plan exactly the chosen length by moving whole seconds between shots (a model that is more than 10 percent, minimum 3 seconds, away is refused). Tested without the model.
- `POST /api/v1/storyboard`: input `{script, seconds, look, language}`, output `{title, look, shots[]}`. The request is checked before any credit is reserved. Credits are reserved first, kept when the plan is written and returned when it is not.
- Price: action `storyboard`, 2 credits, migration `049_storyboard_price.sql`. A placeholder until the real Gemini cost is read from the usage log. Admin-editable like every price.

Client (`client/src/features/generate-form`):
- `storyboard.ts`: pure logic (edit, add, remove, move, exact-length check, stale check, grouping shots into clips of at most 15 seconds, building each clip's prompt). Tested.
- `storyboard-panel.tsx`: appears on the Script step when the length is over 15 seconds. "Write the 45s storyboard", then editable shot cards with a running total ("42s of 45s, 3s to add"). Changing the length or the script marks the plan out of date and offers Rewrite; it never replaces the person's edits by itself.
- The Review step refuses a long video whose storyboard is missing, out of date or not exactly the chosen length, and says what to do.
- A long video is rendered from the approved storyboard. The old even split of the script is only a fallback for a form that has none.
- The parts limit on a stored project rose from 12 to 24, because a 3-minute video of long shots can need up to 22 clips.


## Step 2, as built (19 Nov)

The problem: with sound on, Kling invents a speaker for every clip, so the voice changed every 15 seconds.

The fix: shots are rendered silent and one recording is laid over them.

Server:
- `POST /api/v1/voiceover` `{text, voice?}`: reads the whole script aloud as a single speech job (ElevenLabs multilingual v2 on kie.ai, up to 5,000 characters, so 3 minutes of speech is one request). The text is checked before any credit is reserved. It reuses the existing `speech` job type, its worker and its price (`speech_thousand_chars`, 2 credits per 1,000 characters, so about 6 credits for 3 minutes).
- `POST /api/v1/voiceover/{id}/adopt`: copies the finished recording into the person's own storage (providers' links expire) and returns it as a media file. New: `safenet.SniffAudio` (the file type is read from its bytes, never from the host's label) and `media.AdoptAudio`.

Client (`client/src/features/generate-form`):
- `voiceover-panel.tsx`, inside the storyboard panel: shows the words that will be read, a "Make the voiceover" button, then a player to listen before any video credit is spent. The recording's real length is read from the file for free.
- A recording longer than the video is refused (it would be cut off) and says how many words to trim. A recording much shorter only warns (silence at the end).
- Changing any spoken line marks the recording out of date; the old one is never used for new words.
- With a valid voiceover: the shots are made with sound off (cheaper, about 30 percent less per second), their prompts say "silent footage, no one speaking to camera", and the quote drops the sound surcharge. Without one, behaviour is as before (each part has its own voice).
- When all clips are in, the recording is placed once on the audio track from time zero, under the clips.

Known limits:
- One voice only (the default). Live tests on 19 Nov (about 2 credits each): the old default James (`EkK5I93UQWFDigLMpZcX`) is rejected; "Rachel" is not accepted (the voice field takes ids from KIE's list of 83, never names); Daniel (`onwK4e9ZLuTAKqWW03F9`) works. The default is now Daniel. The result comes back as `resultUrls[0]`, a real MP3 (44.1 kHz mono, about 10.6 seconds for 30 words), and the worker maps it to the `audio_url` the adopt step reads. The voice picker is built (`voices.ts` on the client, `kietools.Voices` on the server, which refuses any id not listed) and lists the five voices confirmed by live tests on 19 Nov: Daniel, Sarah, George, Jessica and Liam (all MP3, 8 to 9 seconds for the 30-word test). The full list of 83 ids and names is on KIE's speech docs page; each new voice needs one real test (about 2 credits). James is on that list yet was rejected on this account, so a listed id is not proof it works. Previews exist at `https://static.aiquickdraw.com/elevenlabs/voice/<id>.mp3`.
- KIE's speech request also accepts `timestamps: true`, which returns word times. That is the way to snap shot cuts to sentence ends later.
- Picture and voice are in step only approximately: the plan assumes 2.5 words per second, and each shot's length comes from that. The recording's total length is checked against the video, but cuts are not yet snapped to sentence ends. A later improvement is to read word times (the editor's caption feature already does) and nudge shot lengths.
- A person speaking to camera cannot lip-sync to a separate recording. That case stays on the talking-avatar path.
- Kling's own ambient sound is lost with silent shots. Background music is added in the editor's music panel, where the person can also upload their own track.

## Cost (to be confirmed)

From `docs/rebuild/pricing-research.md`: Kling 3.0 text or image to video costs about $0.07 to $0.115 per second on kie.ai depending on resolution. A 3-minute video is therefore about $13 to $21 of provider cost, and at 4 credits per second it is 720 credits. That is close to one Pro month ($20). Plan limits must decide how long a video Pro and Free may make. Clips with sound cost about 43 percent more (measured), so silent shots plus a voiceover are also cheaper.

## Time (not measured)

Clips render three at a time (the server limit). A 3-minute video can be up to 22 clips, so up to 8 waves. The render time of one clip has not been measured. It must be measured before promising the person a time.

## Unverified

- The kie.ai Kling 3.0 docs page returned 404 when fetched directly. The following came from search summaries, which disagree with each other and must be checked against the live docs and one real response before step 4: whether single-shot mode accepts a last-frame image in `image_urls`; the exact field name for reference elements (`kling_elements`); whether more than 5 shots per task or more than 15 seconds in total is allowed.
- Nothing in this work has been run against the live Gemini or Kling APIs. Storyboard quality (does it develop a short script to 45 seconds well, does it cut a long one sensibly) is untested.
- The new screens have been type-checked, linted and unit-tested, not opened in a browser.

## Rules this work follows

- No render is started without the owner's yes for that specific render (`generation-credit-budget`).
- Everything avoids making the person wait: the plan is editable on the client with no round trips, and later steps place shots as they land.
