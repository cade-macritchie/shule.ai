# shule

An agentic service that runs from intake to finished deliverables: outreach and booking → an AI interviewer in **your own browser interview room** (Zoom + Recall optional) → interactive ops docs → a Lean Six Sigma audit → animated implementation videos. The full design is in **[SPEC.md](SPEC.md)**.

```
apps/web          Next.js: intake, client portal, interview room (/room), webhooks (Cal.com, Recall), live interviewer turn loop
services/worker   Python: job queue + agents (outreach, plan, post-interview media/PII, docs, LSS audit, storyboard, TTS, render)
packages/video    Remotion explainer (11 data-driven scene types), render.mjs, stills.mjs, validate.mjs
packages/shared   zod schemas (storyboard, LSS), computed metrics (RPN, quadrant, PCE, DPMO → sigma)
prompts/          interviewer, interview_plan, outline, draft, handbook (shared rules), lss_audit, storyboard
supabase/         schema + RLS + queue RPCs + storage buckets
```

## Preview on GitHub Pages

The landing page and intake form are published as a static preview at **https://cade-macritchie.github.io/shule.ai/**, rebuilt on every push to `main` (`.github/workflows/pages.yml` → `gh-pages` branch). The form is disabled there; the room, portal and APIs need the real app. Build it locally with `scripts/build-pages.sh`.

## Run it

```bash
cp .env.example .env            # fill in the keys
npm install
npm run dev                     # web on :3000 (it needs a public URL for webhooks: deploy it, or use a tunnel)
cd services/worker && pip install -r requirements.txt && python worker.py
```

**Offline dry run** (needs only `ANTHROPIC_API_KEY`): `python simulate.py tests/fixtures/sample_transcript.json --render` goes from transcript → pages → audit → storyboard → MP4.

**Preview the video**: `npm run studio`, or `node --experimental-strip-types stills.mjs sample-storyboard.json out/stills` (one PNG per scene). On boxes that can't download Remotion's Chrome, set `BROWSER_EXECUTABLE=/usr/bin/google-chrome`.

## What's verified here

- `npm run typecheck` and `next build`: web, shared and video all compile clean.
- **Interview room in a real browser**: headless Chrome with a fake mic against a mock API. Greeting plays, the voice detector catches each answer, WAVs are posted, replies play back, recording chunks upload, the interviewer's `end` closes the room and flushes the last chunks.
- `npm test -w apps/web` (6): voice detector start/end, short pauses not splitting, blips ignored, strict mode during speech plus barge-in, force-cuts, resample/WAV.
- Worker room tests: stitching out-of-order byte-sliced WebM chunks gives a valid 12 s file; screenshots land on the interview clock (`offset`).
- `npm test -w packages/shared` (4) and `pytest services/worker` (27): LSS schemas and math (RPN, quadrants, PCE gating, sigma at 2σ/3σ/6σ), the fixture audit and storyboard validate under both zod and pydantic, PII classify/column rule/blur, SRT cues, tag parsing.
- Remotion: the sample storyboard renders (a 59 s, 3-scene clip took about 2.5 min on 4 CPU cores; a full guide runs 4–5 min of video).

## Check before going live (needs real accounts)

- **Room**: test on real laptops, with and without headphones. Laptop speakers bleeding into the mic is the main risk; tune `strict` in `lib/vad.ts` if the interviewer interrupts itself. Screen sharing works in desktop Chrome, Edge and Firefox (not on phones).
- **Serverless limits**: chunks are capped at 4 MB (5 s of 1.2 Mbps screen ≈ 0.75 MB). Utterance turns need about 10–20 s of function time with a 30 s cap.

- **Recall** (Zoom medium only): confirm the webhook signature scheme in `apps/web/lib/verify.ts` (written as Svix-style), the `transcript.data` payload shape in `api/webhooks/recall`, and the `media_shortcuts` keys in `ps/services.py`.
- **Zoom**: if the client's tenant blocks external bots or requires recording consent, the bot waits in the waiting room or the consent prompt; `automatic_leave.waiting_room_timeout` is 10 min.
- **Latency**: the live turn takes 0.85 s debounce + Claude Haiku + TTS (about 1.5–3 s). If that feels slow, replace `lib/voice.ts` with a speech-to-speech model; the interviewer state and tags stay the same.
- **PII rules**: `ps/pii.py` is a re-implementation from your rebuild notes with a starter `NOT_NAME_WORDS`. Swap in your tuned `auto_blur.py` rules.
- Consent wording and retention (`RETENTION_DAYS`) are legal decisions; check them for each client.
