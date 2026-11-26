// Interviewer brain, shared by both media:
//   room (default): the browser posts an utterance → decideTurn() → the reply goes back in the HTTP response
//   zoom (optional): Recall webhook → onHumanUtterance() → decideTurn() → broadcast to the bot's page
import Anthropic from "@anthropic-ai/sdk";
import { tag } from "@ps/shared";
import { db, broadcast, log } from "./db";
import { env } from "./env";
import { prompt } from "./prompts";
import { leaveCall } from "./recall";

export type Action = "none" | "ask_screen_share" | "wrap_up" | "end";
export type Turn = { say: string; action: Action; phase: string };

export const CONSENT_SCRIPT = (org: string) =>
  `Hi, I'm the ProcessScope interviewer, an AI working with ${org}. ` +
  `This call is being recorded and transcribed so we can write up how your processes work. ` +
  `You can stop at any time. Is it okay with you to go ahead?`;

const DEBOUNCE_MS = 850;
const HISTORY = 40;

let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic({ apiKey: env.anthropicKey }));

/** One interviewer turn: read state → Claude → update state. Does not speak; the caller delivers `say`. */
export async function decideTurn(interviewId: string, opts: { opening?: boolean } = {}): Promise<Turn | null> {
  const [{ data: iv }, { data: st }, { data: utts }] = await Promise.all([
    db().from("interviews").select("*, engagements(title, intake), interviewees(name, role)").eq("id", interviewId).single(),
    db().from("interview_state").select("*").eq("interview_id", interviewId).single(),
    db().from("interview_utterances").select("speaker,is_bot,text")
      .eq("interview_id", interviewId).order("id", { ascending: false }).limit(HISTORY),
  ]);
  if (!iv || !st || st.phase === "ended") return null;

  const minutes = Math.round((+new Date(iv.end_at) - +new Date(iv.start_at)) / 60000);
  const elapsed = Math.round((Date.now() - +new Date(iv.started_at ?? iv.start_at)) / 60000);
  const org = iv.engagements?.intake?.company ?? "the client";
  const who = iv.interviewees ? `${iv.interviewees.name}${iv.interviewees.role ? `, ${iv.interviewees.role}` : ""}` : "the interviewee";

  const phaseNote = opts.opening
    ? `PHASE: opening. ${who} has just joined the room and has already agreed on screen to the AI interview and the recording. ` +
      `Greet them by first name, say in one sentence that you're an AI interviewer and that they can press End at any time, then ask the first plan question.`
    : st.phase === "consent"
      ? `PHASE: consent. You just asked for consent to record. If they clearly agreed, add <consent>yes</consent>, thank them briefly and ask the first plan question. If they declined or were unsure, add <consent>no</consent>, say a kind goodbye and use <action>end</action>.`
      : elapsed >= minutes * 0.85 && st.phase !== "wrap_up"
        ? "PHASE: time to wrap up now."
        : `PHASE: ${st.phase}.`;

  const history = (utts ?? []).reverse().map(u => `${u.is_bot ? "YOU" : u.speaker}: ${u.text}`).join("\n");

  const msg = await claude().messages.create({
    model: env.modelLive,
    max_tokens: 400,
    system: prompt("interviewer", { org, minutes, elapsed, medium: iv.medium === "zoom" ? "a Zoom call" : "a browser video room" }),
    messages: [{
      role: "user",
      content:
        `<plan>${JSON.stringify(st.plan)}</plan>\n<coverage>${JSON.stringify(st.coverage)}</coverage>\n` +
        `<summary>${st.summary}</summary>\n${phaseNote}\n<conversation>\n${history || "(nothing yet)"}\n</conversation>`,
    }],
  });
  const text = msg.content.map(b => (b.type === "text" ? b.text : "")).join("");

  const say = tag(text, "say") ?? "";
  const action = ((tag(text, "action") ?? "none").trim() as Action);
  const consent = tag(text, "consent");
  let coverage = st.coverage;
  try { coverage = { ...st.coverage, ...JSON.parse(tag(text, "coverage") || "{}") }; } catch { /* keep old */ }
  const note = tag(text, "note");

  let phase: string = opts.opening ? "interview" : st.phase;
  if (st.phase === "consent" && !opts.opening) phase = consent === "yes" ? "interview" : "ended";
  if (action === "wrap_up") phase = "wrap_up";
  if (action === "end") phase = "ended";

  await db().from("interview_state").update({ coverage, phase, turns: st.turns + 1 }).eq("interview_id", interviewId);
  if (note) await log(iv.engagement_id, "interview_note", interviewId, { note });
  if (consent === "no") {
    await db().from("interviews").update({ status: "declined" }).eq("id", interviewId);
    await log(iv.engagement_id, "consent_declined", interviewId);
  }
  return { say, action, phase };
}

/** Record a line the interviewer actually said (room: after playback; zoom: when sent to the bot). */
export async function logBotLine(interviewId: string, text: string, t?: number | null, interrupted = false) {
  await db().from("interview_utterances").insert({
    interview_id: interviewId, speaker: "interviewer", is_bot: true, t_start: t ?? null,
    text: interrupted ? `${text} [interrupted]` : text,
  });
}

// ---------------- Zoom / Recall path ----------------

export async function onHumanUtterance(interviewId: string, utteranceId: number) {
  await new Promise(r => setTimeout(r, DEBOUNCE_MS));
  const { data: latest } = await db().from("interview_utterances")
    .select("id").eq("interview_id", interviewId).eq("is_bot", false)
    .order("id", { ascending: false }).limit(1).single();
  if (latest && latest.id !== utteranceId) return;

  const { data: locked } = await db().rpc("take_turn_lock", { iid: interviewId, ms: 8000 });
  if (!locked) return;
  try {
    const turn = await decideTurn(interviewId);
    if (!turn) return;
    if (turn.say) await speak(interviewId, turn.say, { leaveAfter: turn.action === "end", screenShare: turn.action === "ask_screen_share" });
    else if (turn.action === "end") {
      const { data: iv } = await db().from("interviews").select("bot_id").eq("id", interviewId).single();
      if (iv?.bot_id) await leaveCall(iv.bot_id);
    }
  } finally {
    await db().from("interview_state").update({ turn_lock_until: null }).eq("interview_id", interviewId);
  }
}

export async function sayConsent(interviewId: string) {
  const { data: iv } = await db().from("interviews").select("engagements(intake)").eq("id", interviewId).single();
  const org = (iv as any)?.engagements?.intake?.company ?? "your organization";
  await speak(interviewId, CONSENT_SCRIPT(org));
}

export async function speak(interviewId: string, text: string, opts: { leaveAfter?: boolean; screenShare?: boolean } = {}) {
  await logBotLine(interviewId, text);
  await broadcast(interviewId, "say", { text, leaveAfter: !!opts.leaveAfter, chip: opts.screenShare ? "Share your screen" : null });
}
