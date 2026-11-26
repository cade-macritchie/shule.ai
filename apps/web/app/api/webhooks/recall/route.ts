import { NextResponse, after } from "next/server";
import { db, enqueue, broadcast, log } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyRecall } from "@/lib/verify";
import { onHumanUtterance, sayConsent } from "@/lib/interviewer";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyRecall(raw, req.headers, env.recallSecret)) return new NextResponse("bad signature", { status: 401 });
  const evt = JSON.parse(raw) as { event: string; data: any };

  const botId: string | undefined = evt.data?.bot?.id ?? evt.data?.bot_id;
  if (!botId) return NextResponse.json({ ok: true });
  const { data: iv } = await db().from("interviews").select("id, engagement_id, status").eq("bot_id", botId).single();
  if (!iv) return NextResponse.json({ ok: true });

  switch (evt.event) {
    // ---- real-time endpoint events ----
    case "transcript.data": {
      const d = evt.data.data;
      const words: { text: string; start_timestamp?: { relative: number }; end_timestamp?: { relative: number } }[] = d.words ?? [];
      const text = words.map(w => w.text).join(" ").replace(/\s+([,.?!])/g, "$1").trim();
      if (!text) break;
      const speaker = d.participant?.name ?? "Interviewee";
      const { data: row } = await db().from("interview_utterances").insert({
        interview_id: iv.id, speaker, is_bot: false, text,
        t_start: words[0]?.start_timestamp?.relative ?? null,
        t_end: words.at(-1)?.end_timestamp?.relative ?? null,
      }).select("id").single();
      if (row) after(() => onHumanUtterance(iv.id, row.id));
      break;
    }
    case "participant_events.speech_on": {
      // barge-in: the human started talking while the bot speaks → cut the bot's audio
      const { data: st } = await db().from("interview_state").select("bot_speaking").eq("interview_id", iv.id).single();
      if (st?.bot_speaking) await broadcast(iv.id, "stop", {});
      break;
    }
    // ---- bot status webhooks ----
    case "bot.in_call_recording":
      if (iv.status !== "live") {
        await db().from("interviews").update({ status: "live" }).eq("id", iv.id);
        await db().from("engagements").update({ status: "interviewing" }).eq("id", iv.engagement_id);
        after(async () => { await new Promise(r => setTimeout(r, 2500)); await sayConsent(iv.id); });
      }
      break;
    case "bot.joining_call":
      await db().from("interviews").update({ status: "joining" }).eq("id", iv.id);
      break;
    case "bot.done":
      if (iv.status !== "declined") {
        await db().from("interviews").update({ status: "done" }).eq("id", iv.id);
        await enqueue("post_interview", { interview_id: iv.id });
      }
      await db().from("interview_state").update({ phase: "ended" }).eq("interview_id", iv.id);
      break;
    case "bot.fatal":
      await db().from("interviews").update({ status: "failed" }).eq("id", iv.id);
      await log(iv.engagement_id, "bot_fatal", iv.id, evt.data);
      await enqueue("notify_staff", { subject: "Interview bot failed", interview_id: iv.id });
      break;
  }
  return NextResponse.json({ ok: true });
}
