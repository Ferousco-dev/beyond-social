# Beyond Social: what's missing and how to make generation better

Research done on 24 Nov 2026. It is based on reading the code on `main` (`320f911`), looking at competing tools, and searching for open-source projects.
Nothing in this document has been built yet.

## 1. What the product does today

| Area | What exists | Model / tool |
|---|---|---|
| Ideas | Trending videos (Apify), paste a link, own idea, Gemini script and storyboard (3–8 s shots, up to 180 s) | Gemini 3.8 Flash |
| Make a video | One request per clip. Several shots go in one `multi_prompt` call, with an optional single picture | `kling-3.0/video` |
| Avatar | Talking photo from a picture plus a voice | `kling/ai-avatar-pro`, ElevenLabs TTS, HeyGen (Phase 4) |
| Own video | Change the outfit or background on a 3–15 s clip. **The output is silent** | `kling-3.0-omni/transformation` |
| Long video | Parts made one by one, joined in the **browser** editor | MediaBunny |
| Editor | Timeline, karaoke captions from word timings, a music track, ending card, AI assist | Gemini transcription |
| Publish | YouTube, TikTok, Instagram, schedule calendar | Direct platform APIs |
| Analytics | **YouTube only**, plus a best-time recommender | YouTube API |
| Money | Credit ledger, Stripe, packs, Free-plan multiplier | — |

## 2. The real reasons the videos look "AI"

1. **Everything is invented from text.** Each shot is a fresh text-to-video render, and the only thing tying the shots together is the storyboard's `Look` sentence. The person's face, clothes and room drift from shot to shot. That drift is the strongest sign that a video is AI.
2. **One model for every shot.** Kling 3.0 is good at motion, but it isn't the best at talking people, product close-ups or native sound. Competitors pick a different model for each kind of shot.
3. **No real sound pipeline.** Generated clips use `sound` from the model, edited clips are silent, and there is no server-side audio step. Real UGC has room tone, a slightly imperfect voice and music ducking under speech.
4. **Too clean.** There is no grain, no handheld micro-shake, no phone-camera colour, and the motion is too smooth. Ad tools add these on purpose.
5. **No quality check before the user sees it.** Melted hands, garbled text or a face swap mid-clip go straight to the user, and they have already paid.

## 3. Gaps against competitors

From the 2026 comparisons ([designrevision](https://designrevision.com/blog/best-ai-ugc-tools), [adlibrary](https://adlibrary.com/posts/best-ai-ugc-video-generators), [rekreate](https://rekreate.ai/compare/best-ai-ugc-video-generators), [capturable](https://capturable.ai/best/ai-ugc-ad-generator)):

| Competitor strength | Us | Gap |
|---|---|---|
| **Creatify**: product URL → ready ad, batch variants for A/B tests | Link analysis exists, one video at a time | **Batch hooks/variants** (one script → 3–5 different opening 3 s) |
| **Arcads**: big library of realistic actors, direct-response templates | The user's own face or a talking photo | **Stock actor library** and **ad templates** (hook → problem → demo → CTA) |
| **HeyGen**: 175+ languages, video translation | English only | **Translate and dub** a finished video, with lip-sync to the new language |
| **Captions**: polished kinetic captions, finishing tools | Karaoke captions | More caption styles, auto zoom-cuts, B-roll insert, silence removal |
| All of them: show what works | YouTube metrics only | **TikTok and Instagram metrics**, plus "your best hooks" learning |

## 4. Improving generation: what to use

### 4a. Models already on kie.ai (no new vendor, just new model ids)

These come from kie.ai pages and third-party READMEs ([kie.ai](https://kie.ai/), [Kling on kie](https://kie.ai/market/kling), [Seedance](https://kie.ai/seedance-2-0), [kie-mcp](https://github.com/elibarnett/kie-mcp), [kie-cli-mcp](https://github.com/felores/kie-cli-mcp)). Confirm the ids and prices on the kie dashboard before building.

| Use | Model | Why |
|---|---|---|
| Talking person with sound | **Seedance 2.x** or **Veo 3.1** | Native audio with tight lip-sync in one pass, instead of avatar plus TTS stitching |
| Longer single shots | **Kling 4.0** (3–30 s) | Fewer cuts mean less drift |
| Same face in every shot | **Seedream / Nano Banana** to make one "hero frame" per person and place, then image-to-video for every shot | Highest-impact fix for consistency |
| Re-dub the user's own footage | **Volcengine video-to-video lip-sync** | "Say new words with my real video": very real, and nothing is generated from scratch |
| Talking avatar | **OmniHuman 1.5 / InfiniTalk** | More natural head and body than a talking photo |
| Final polish | **Veo 1080p / 4K upscale** | Sharper exports |

### 4b. Open-source projects worth using or learning from

| Project | Licence | What we'd take from it |
|---|---|---|
| **FFmpeg** | LGPL/GPL | Put the original sound back on edited videos, join long videos on the server, burn captions, add grain/LUT. **Biggest single unblocker.** |
| **LatentSync** (ByteDance) | Apache-2.0 | Self-hostable lip-sync of real footage if kie's lip-sync is too pricey |
| **MuseTalk 1.5** (Tencent Music) | MIT | Real-time lip-sync with better identity keeping |
| **LivePortrait** | MIT (InsightFace parts non-commercial, so check) | Drive a still photo with the user's own expressions |
| **Wan 2.2 / Wan Animate, VACE** (Alibaba) | Apache-2.0 | Open models for character replacement and video editing, and kie already hosts Wan. A fallback to Kling Omni |
| **LTX-2.5** | Open weights, free under $10M revenue | Self-hosted 4K with audio, if GPU costs ever beat kie |
| **WhisperX** | BSD | Exact word timings for captions, cheaper and steadier than asking Gemini |
| **Demucs** | MIT | Split voice from background before an edit, then put it back |
| **Real-ESRGAN / RIFE** | BSD / MIT | Upscale and smooth frame rate |
| **ViMax** (multi-agent script → video) | check | How it keeps characters consistent across scenes, to copy into `storyboard` |
| **MoneyPrinterTurbo** (~100k★, MIT) | MIT | Reference for the topic → script → footage → subtitles → voice → music pipeline. It is short-form only ([dev.to](https://dev.to/creeta/101k-stars-and-cant-do-long-form-moneyprinterturbos-limit-26jk)) |
| **ShortGPT** | MIT | Reference for longer narrated videos with stock B-roll |

Lists to keep watching: [awesome-video-generation](https://github.com/backblaze-labs/awesome-video-generation), [awesome-ai-video-generation](https://github.com/yan-labs/awesome-ai-video-generation).

**On self-hosting:** don't host GPU models yet. kie is cheaper per second than running our own GPUs at our volume. Open-source matters most here for **FFmpeg, WhisperX and Demucs**, which run on a CPU.

## 5. Recommended plan, in order

| # | Work | Why first | Size |
|---|---|---|---|
| 1 | **Media worker with FFmpeg.** Render already has a `server/Dockerfile`: switch the service from `runtime: go` to Docker and add ffmpeg. Use it to put the sound back on edited videos, join long videos on the server, and burn captions | Unblocks 2, 4 and 6. Fixes the silent edits. The free plan has 512 MB of RAM: copying streams is fine, but re-encoding 3-minute videos needs a paid instance or a separate worker | M |
| 2 | **Hero frame → image-to-video.** For every shot, make one reference image per person and place, then animate it | Biggest realism win | M |
| 3 | **Route the model per shot.** Talking → Seedance/Veo with audio. Action/B-roll → Kling. Long shot → Kling 4.0. Credits are priced per model | Better quality at the same price | M |
| 4 | **"Make it real" finishing pass.** Light grain, phone LUT, micro-shake, slight loudness and room tone, on by default | Cheap, and it fixes the clean AI look | S |
| 5 | **Automatic quality check.** Gemini watches each clip for broken hands, text, face swaps or a frozen mouth. Re-roll once for free, or refund automatically | Trust, and fewer support complaints | M |
| 6 | **Lip-sync re-dub of the user's own video** (kie Volcengine, or LatentSync) | Very real. Pairs with the composer | S–M |
| 7 | **Hook variants.** One script → 3 different 3-second openings, for A/B posting | Matches Creatify, the reason people buy | S |
| 8 | **TikTok and Instagram metrics**, then feed the best hooks back into the prompt memory | Closes the learning loop | M |
| 9 | **Translate and dub** a finished video | Matches HeyGen. Reuses 6 | M |
| 10 | Stock actor library and ad templates | Matches Arcads. Needs licensed faces, which is a legal question | L |

Housekeeping from `docs/PROGRESS.md` that is still open: credit **expiry** has no producer, **database backups** are missing, and the KIE webhook secret must be set, because production refuses unsigned callbacks.

## 6. Things to decide

- Budget for a paid Render instance or a separate media worker, needed for item 1 on 3-minute videos.
- Whether to test Seedance/Veo with real credits. Each test costs money and needs your OK.
- Whether stock actors are wanted. That means licensing real people's likeness.
