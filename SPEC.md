# shule (formerly ProcessScope): agentic process interviews → ops docs → Lean Six Sigma audit → explainer videos

> **Update:** interviews now run in ProcessScope's own **browser interview room** (§2a) by default: no Zoom, no meeting bot.
> The Zoom + Recall.ai path below still works with `INTERVIEW_MEDIUM=zoom`.

Built on the patterns in the Gateway Operations handbook and the video/PII pipeline (docs-as-code pages with frontmatter, flow → procedure links, a Questions board, draft → diff → approve, sanitizing, OCR + blur). New pieces: an AI interviewer that joins Zoom live, an outreach/scheduling agent, a Lean Six Sigma audit model, and generated explainer videos.

Account IDs, keys and URLs are left out. They go in `.env` (see `.env.example`).

---

## 1. What the client experiences

1. **Intake** (`/start`): name, email, company, the process(es) they want looked at, who knows them best (one or more interviewees), and any files (SOPs, screenshots, exports).
2. **Outreach agent** emails each interviewee: what will happen, that an AI interviewer will join and record, and a Cal.com booking link. It sends reminders at +2 days and +5 days if nobody has booked, and 24 h / 1 h before the call.
3. **Booking** (Cal.com, with Zoom as the location) → webhook → the interview gets scheduled → a Recall.ai bot is created with `join_at` = start − 1 min.
4. **Live interview** (30–60 min). The bot joins Zoom as "ProcessScope Interviewer" with an animated avatar on camera. It opens with a consent script (AI + recording, and the option to stop at any time), then works through a **SIPOC coverage plan** generated from the intake: it asks follow-ups, asks for screen shares ("could you show me that screen?"), checks numbers back, and closes with a recap.
5. **Processing** (about 10–20 min after the call): the recording is downloaded, the transcript diarized, screenshots taken at screen changes and personal data blurred (`pii.py`), pages drafted, and the LSS audit run.
6. **Portal** (`/portal/<engagement>`): an interactive process map, procedure pages, a **Findings** tab (impact/effort matrix, waste heatmap, FMEA, a DMAIC roadmap), a Questions board for follow-ups, and **Videos**.
7. **Explainer video** (3–6 min, 1080p MP4 + captions) for each major problem: current state → root cause → future state → implementation steps (systems, fields, automations, owners) → control plan. It is generated automatically after the first audit, and on demand from any audit or optimization run ("☐ generate a video guide").
8. **Follow-up loop**: open questions can be answered in the portal, or the agent books a short second interview that covers only those questions.

## 2. Architecture

```
            ┌──────────── Next.js (apps/web, Vercel) ────────────┐
 client ───►│ /start  /portal/*  /agent/<interview> (bot camera) │
            │ /api/intake  /api/webhooks/{cal,recall,resend}     │
            │ /api/portal/*  (answers, approve, request-video)   │
            └───────┬───────────────────────────────┬────────────┘
                    │ Supabase (Postgres + Auth +   │ Recall.ai
                    │ Storage + Realtime)           │  bot ⇄ Zoom
                    ▼                               │
            jobs table (SKIP LOCKED queue)          │ transcript.data webhook
                    │                               ▼
     ┌──────────────┴───────────── services/worker (Python, one box w/ ffmpeg) ──┐
     │ outreach · interview_plan · post_interview (media, pii) · draft_docs      │
     │ lss_audit · storyboard · tts · render (calls packages/video via node)     │
     └───────────────────────────────────────────────────────────────────────────┘
                    │
            packages/video (Remotion) → MP4 → Supabase Storage
```

- **Web** does only what must be fast or public: webhooks, the live interviewer turn loop, portal reads/writes.
- **Worker** does everything slow: Claude calls with Opus, ffmpeg, OCR, TTS, Remotion render. One process per box; scale by adding boxes (the queue is safe for concurrent workers).
- **Agent page** (`/agent/<id>?t=<token>`) is what Recall streams as the bot's camera + mic (Output Media, `variant: web_4_core`). It subscribes to a Supabase Realtime channel `interview:<id>`, plays the TTS of each `say` event, and animates an avatar (speaking/listening/thinking states + the current topic chip).

### Live turn loop (latency budget ≈ 1.5–3 s)

```
Zoom audio → Recall streaming transcript → POST /api/webhooks/recall (transcript.data, final utterances)
  → append to interview_utterances
  → endOfTurn(): the speaker is not the bot, and there are ≥ 900 ms of silence or a final utterance ending in ?.!
  → interviewer.turn(state)  [Claude Haiku-class model, short output, tagged blocks]
       returns <say>, <coverage> deltas, <action> (none|ask_screen_share|wrap_up|end)
  → upsert interview_state, broadcast {type:'say', text} on interview:<id>
agent page → TTS (streamed) → audio out → Recall → Zoom
```

- **Barge-in**: when the interviewee starts talking while the bot speaks (a `participant_events.speech_on` event for a non-bot participant), broadcast `{type:'stop'}` and the page cuts the audio.
- **Single-flight**: a turn lock per interview (`interview_state.turn_lock_until`), so overlapping webhooks don't produce two answers.
- **Why not voice-to-voice?** A realtime speech model gives lower latency. This pipeline keeps Claude as the interviewer and stays debuggable (every turn is text in the database). The voice layer is an adapter (`apps/web/lib/voice.ts`), so a speech-to-speech provider can replace TTS later without touching the interviewer brain.

### Interviewer brain (`apps/web/lib/interviewer.ts`, `prompts/interviewer.md`)

State = plan + coverage + last ~40 utterances + a running summary (compacted every 20 turns by the worker).

The **coverage plan** is SIPOC+, per process:

| Slot | Asks until it has |
|---|---|
| trigger | what starts it, how often (frequency, volume/week) |
| suppliers / inputs | who/what feeds it, and in what form |
| steps | ordered stages; for each one: who, system, how long it *takes* (touch time) vs how long it *waits* |
| handoffs | each person/system change and how it's signalled |
| outputs / customers | what's produced and who receives it; what "done right" means to them (CTQ) |
| defects | what goes wrong, how often, how it's caught, rework |
| exceptions | edge cases and workarounds |
| metrics | any numbers they already track |
| pain | the interviewee's top 3 frustrations, in their words |

Rules: one question at a time, ≤ 2 sentences; reflect back numbers ("so about 40 a week, each taking 15 minutes?"); never lead or suggest answers; ask for a screen share when they describe a screen; don't collect personal data about non-staff (if they read out a student's details, say "no need for specifics"); respect the time box (wrap up at 85% of booked time); end when told to.

## 2a. Browser interview room (default medium)

The interviewee opens `/room/<interview>?t=<token>` from the confirmation email. The room opens 15 minutes before the booked time.

1. **Pre-join**: what to expect, a tip to use headphones, and a **consent checkbox** (AI interviewer + recording). Consent is logged with a timestamp and user agent. No spoken consent script is needed.
2. **Audio in**: mic → AudioWorklet → `lib/vad.ts` (adaptive noise floor, 130 ms to start, 1 s of silence to end, 400 ms pre-roll, 45 s max) → 16 kHz WAV → `POST /api/room/<id>/utterance` → speech-to-text (`lib/stt.ts`: Deepgram nova-3 with key terms, or OpenAI) → `decideTurn()` → the reply comes back in the same response.
3. **Audio out**: `op:tts` → WebAudio playback. The bot's line is logged only once it has actually played (`op:spoken`, marked `[interrupted]` if cut off), so the transcript matches what was said.
4. **Turn-taking**: while the interviewer speaks, the detector goes "strict" (louder and longer speech needed), so speaker bleed doesn't trigger it but a real interruption stops playback (barge-in). If the person starts talking again while a reply is being prepared, that reply is dropped and the next utterance takes the turn. Mid-monologue cuts are sent with `reply=false`.
5. **Recording**: one MediaRecorder on (mic + interviewer voice) mixed in WebAudio, plus one per screen-share session (VP9, 5 fps). Each sends 5 s chunks to `/api/room/<id>/chunk` → `media/<eng>/<iv>/room/<stream>/NNNNNN.webm`. `op:stream_start` records each stream's offset on the interview clock.
6. **End**: by the person, by the interviewer's `end` action, or 10 min past the booking. Recorders flush, then `op:end` → `post_interview` (delayed 60 s).
7. **Processing** (`room_media`): stitch each stream's chunks into one WebM (`ffmpeg -c copy`), take screenshots from the screen streams with `offset` so frame times line up with the transcript, then blur → the same docs/audit pipeline as before. The live transcript is the transcript.
8. **No-show**: 20 min after the start, if nobody joined, the interview is marked `no_show` and the person gets a rebooking link.

Cal.com setup: set the event location to "link sent by email" (the room link comes in the `booking_confirmed` email and the reminders).

## 3. Data model (Supabase, `supabase/migrations/0001_init.sql`)

| Table | Key fields |
|---|---|
| `orgs` | id, name, slug, plan, created_at |
| `org_members` | org_id, user_id, role (`client_admin`, `client_viewer`, `staff`) |
| `engagements` | id, org_id, title, status, intake jsonb, auto_publish bool, video_policy (`major`, `all`, `none`) |
| `interviewees` | id, engagement_id, name, email, role, booking_uid, status |
| `interviews` | id, engagement_id, interviewee_id, medium (room/zoom), start_at, end_at, started_at, zoom_url?, bot_id?, agent_token (the room link secret), streams jsonb, status (+ no_show), recording_path |
| `interview_state` | interview_id, plan jsonb, coverage jsonb, summary, turn_lock_until, bot_speaking bool |
| `interview_utterances` | id, interview_id, speaker, is_bot, t_start, t_end, text |
| `pages` | id, engagement_id, path, markdown, meta jsonb, status, version |
| `page_versions` | id, page_id, markdown, message, author, created_at |
| `questions` | id (`q-xxxxxx`), engagement_id, page_path, step, kind, importance, question, why, source, status, answer… |
| `audits` | id, engagement_id, scope jsonb, status, result jsonb, generate_video bool |
| `findings` | id, audit_id, engagement_id, … (§4) |
| `videos` | id, engagement_id, finding_ids uuid[], status, storyboard jsonb, mp4_path, srt_path, duration_s |
| `jobs` | id, kind, payload jsonb, status, run_after, attempts, locked_by, locked_until, error |
| `activity` | id, engagement_id, at, who, action, target, detail |

RLS: the client's members can read rows for their org's engagements, and `client_admin` can answer questions and approve pages. All writes from webhooks/worker use the service role. The `claim_job(worker, kinds[])` RPC uses `FOR UPDATE SKIP LOCKED`.

Engagement status: `intake → outreach → scheduled → interviewing → processing → review → audited → delivered` (+ `follow_up`).

## 4. Lean Six Sigma audit model (`prompts/lss_audit.md`, `packages/shared/src/lss.ts`)

The audit reads the pages, transcript excerpts (with timestamps) and screenshots OCR, and returns JSON.

**Process level**
- `sipoc`: suppliers, inputs, process (5–7 macro steps), outputs, customers.
- `value_stream`: per step `{step, owner, system, touch_min, wait_min, value: VA|BVA|NVA, source: stated|estimated|unknown}`. **PCE** = Σ VA touch time / lead time, computed in code and only when ≥ 70% of the times are `stated`; otherwise "insufficient data" plus a question.
- `ctq_tree`: customer need → driver → measurable CTQ.
- `sigma` (optional): only when the interviewee gave defects + opportunities + units: DPMO = defects / (units × opportunities) × 10⁶; sigma level = Φ⁻¹(1 − DPMO/10⁶) + 1.5 (computed in code).

**Findings** (`findings` rows)

| Field | Meaning |
|---|---|
| title, summary | one problem, stated plainly |
| page_path, steps[] | where it lives in the docs |
| waste[] | TIMWOODS: Transport, Inventory, Motion, Waiting, Overproduction, Over-processing, Defects, Skills (unused talent) |
| value | VA / BVA / NVA for the affected steps |
| root_causes[] | fishbone 6M: Method, Machine (systems), Material (data/inputs), Man (people/skills), Measurement, Mother Nature (environment/policy) + a 5-Whys chain |
| fmea | severity, occurrence, detection (1–10) → **RPN** = S×O×D (computed) |
| impact, effort | 1–5 each → quadrant: quick win / major project / fill-in / thankless |
| dmaic | phase to start in and the next action for each phase |
| recommendation | the future state + concrete implementation (systems, fields, automations, owners), plus a **poka-yoke** where a mistake-proofing step fits |
| control_plan | metric, target, how it's measured, owner, frequency, reaction plan |
| evidence[] | `{t: "00:14:32", quote ≤ 25 words}` or `{page, step}`. **Every finding needs evidence.** |
| confidence | high / medium / low |
| major | computed: RPN ≥ 200, or impact ≥ 4 and confidence ≠ low |

Rules: never invent numbers (estimates are labelled `estimated`, with the basis given); Kaizen-sized items are fine; at most 12 findings, ranked; gaps become Questions (`source: audit`).

**Optimization runs** = an audit scoped to one finding or flow, with an extra `option_analysis` (2–3 solution options compared on cost, time, risk and systems touched) and a `pilot_plan`.

## 5. Explainer video (`packages/video`, `prompts/storyboard.md`)

1. **Storyboard** (Claude, Opus): from 1–3 findings + the pages they touch, return `storyboard.json`: an ordered list of scenes, each one `{kind, narration, data}`. Narration runs 130–150 wpm; 3–6 minutes total.

| Scene kind | Visual (data-driven React components) |
|---|---|
| `title` | finding title, engagement, the "why this matters" stat |
| `current_state` | animated swimlane of steps by owner; NVA steps pulse red, wait times shown as gaps |
| `waste` | TIMWOODS tiles that light up for the wastes present, with an evidence quote |
| `fishbone` | 6M bones drawn in, causes appear one by one, the root cause highlighted |
| `metric` | a big number with a baseline → target bar (only `stated`/`estimated` values, labelled) |
| `future_state` | the swimlane morphs: removed steps fade out, automations get a ⚡ badge |
| `implementation` | numbered build steps, each with a system chip, config detail (fields, triggers, rules) and an owner |
| `architecture` | boxes and arrows of systems + data flow (e.g. Slate → webhook → n8n → Jenzabar) |
| `roadmap` | DMAIC timeline with weeks and milestones |
| `control` | control-plan table + an SPC-style chart sketch with control limits (illustrative, labelled) |
| `outro` | the three next actions + who owns them |

2. **TTS** per scene (ElevenLabs or OpenAI, behind `pipeline/tts.py`) → a WAV per scene; the scene's length = audio length + 0.6 s. Captions come from the narration with per-scene times (≤ 42 chars, ≤ 4 s per cue, the same rules as `clean_video.py`).
3. **Render**: `node packages/video/render.mjs props.json out.mp4` (Remotion `renderMedia`, h264, CRF 20, 1920×1080, 30 fps). The audio is placed per scene with `<Audio>` inside each `<Sequence>`.
4. **Check**: reuse `auto_blur.py --check` on the output (screenshots in scenes are already blurred, but this confirms it), then upload to Storage and mark `videos.status = ready`.

## 6. Sanitizing and consent (carried over)

- The draft prompt's sanitizing rules stay unchanged (secrets → where they live; non-staff personal data → removed/truncated; `:::sensitive` blocks).
- Screenshots go through `pii.find_pii` + blur before anything is stored or sent to Claude. Raw recordings stay in a private bucket, and a job deletes them after `RETENTION_DAYS` (default 30).
- The interviewer's first line is a fixed consent script (it is not generated). If the interviewee declines, the bot says goodbye and leaves, and the interview is marked `declined`.
- Every Claude output that reaches the client is logged to `activity` with its `<sanitized>` report.

## 7. Jobs

| kind | trigger | does |
|---|---|---|
| `outreach` | intake, cron | email booking links and reminders (Resend) |
| `interview_plan` | booking | builds the SIPOC+ plan from the intake + files → `interview_state.plan` |
| `post_interview` | Recall `bot.done` | download the mixed MP4 → transcript (Recall's diarized transcript, falling back to faster-whisper) → frames + blur |
| `draft_docs` | post_interview | outline into processes (outline prompt) → one draft per page → auto-publish or review |
| `lss_audit` | draft_docs done, or portal "Run audit/optimization" | §4 |
| `storyboard` | audit done (policy) or "Generate video guide" | §5.1 |
| `render_video` | storyboard | TTS + Remotion + check + upload |
| `follow_up` | open high-importance questions remaining 48 h after delivery | email, or book a 15-min follow-up interview limited to those questions |
| `retention` | daily | delete raw media older than `RETENTION_DAYS` |

Retries: exponential backoff (1, 4, 16 min), max 3 attempts, then `failed` + an activity row + a staff email.

## 8. Build checklist

1. Supabase project → run the migration → create buckets `media` (private), `frames`, `videos`.
2. Fill in `.env`: Anthropic, Supabase, Recall (region + key + webhook secret), Cal.com webhook secret, Resend, TTS key, `PUBLIC_BASE_URL`.
3. Cal.com event type "Process interview (45 min)", location Zoom, webhook → `/api/webhooks/cal` (BOOKING_CREATED / RESCHEDULED / CANCELLED).
4. Recall dashboard: webhook → `/api/webhooks/recall`; confirm `transcript.data` and the bot status events.
5. `npm i` → `npm run dev -w apps/web`.
6. `cd services/worker && pip install -r requirements.txt && python worker.py`.
7. `npm i -w packages/video` and `npx remotion studio` to preview scenes using `sample-storyboard.json`.
8. Dry run: `python worker.py --once --simulate tests/fixtures/sample_transcript.json` takes a canned transcript through docs → audit → storyboard without Zoom.
