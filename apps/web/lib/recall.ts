import { env } from "./env";

const api = (p: string) => `https://${env.recallRegion}.recall.ai/api/v1${p}`;
const headers = () => ({ Authorization: `Token ${env.recallKey}`, "Content-Type": "application/json" });

export async function createInterviewBot(o: { interviewId: string; agentToken: string; zoomUrl: string; joinAt: Date }) {
  const body = {
    meeting_url: o.zoomUrl,
    bot_name: env.botName,
    join_at: o.joinAt.toISOString(),
    variant: { zoom: "web_4_core" }, // output media needs the 4-core bot
    output_media: {
      camera: { kind: "webpage", config: { url: `${env.baseUrl}/agent/${o.interviewId}?t=${o.agentToken}` } },
    },
    recording_config: {
      transcript: { provider: { recallai_streaming: { mode: "prioritize_low_latency", language_code: "en" } } },
      realtime_endpoints: [{
        type: "webhook",
        url: `${env.baseUrl}/api/webhooks/recall`,
        events: ["transcript.data", "participant_events.speech_on", "participant_events.join", "participant_events.leave"],
      }],
    },
    automatic_leave: { everyone_left_timeout: 60, waiting_room_timeout: 600 },
    metadata: { interview_id: o.interviewId },
  };
  const r = await fetch(api("/bot/"), { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Recall create bot ${r.status}: ${await r.text()}`);
  return (await r.json()) as { id: string };
}

export async function deleteBot(botId: string) {
  // Only works before the bot has joined; otherwise use leave.
  await fetch(api(`/bot/${botId}/`), { method: "DELETE", headers: headers() });
}

export async function leaveCall(botId: string) {
  await fetch(api(`/bot/${botId}/leave_call/`), { method: "POST", headers: headers() });
}

export async function sendChat(botId: string, message: string) {
  await fetch(api(`/bot/${botId}/send_chat_message/`), { method: "POST", headers: headers(), body: JSON.stringify({ message }) });
}
