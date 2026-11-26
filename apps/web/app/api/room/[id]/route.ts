// Interview room control: start, spoken (ack what was actually played), tts, screen_start, end.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, enqueue, log } from "@/lib/db";
import { roomAuth, STREAM } from "@/lib/room";
import { decideTurn, logBotLine } from "@/lib/interviewer";
import { synthesize } from "@/lib/voice";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("start") }),
  z.object({ op: z.literal("spoken"), text: z.string().max(2000), t: z.number().nullable(), interrupted: z.boolean().default(false) }),
  z.object({ op: z.literal("tts"), text: z.string().min(1).max(1200) }),
  z.object({ op: z.literal("stream_start"), stream: z.string().regex(STREAM), offset_s: z.number().min(0) }),
  z.object({ op: z.literal("end"), reason: z.enum(["user", "agent", "timeout"]).default("user"), chunks: z.record(z.string(), z.number().int()).default({}) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await roomAuth(req, id);
  if (!iv) return new NextResponse("forbidden", { status: 403 });
  const b = Body.parse(await req.json());

  switch (b.op) {
    case "start": {
      if (!["scheduled", "live"].includes(iv.status)) return NextResponse.json({ error: `This interview is ${iv.status}.` }, { status: 409 });
      if (Date.now() < +new Date(iv.start_at) - 15 * 60_000)
        return NextResponse.json({ error: `It's a bit early: the room opens 15 minutes before ${new Date(iv.start_at).toUTCString()}.` }, { status: 409 });
      const opening = iv.status === "scheduled";
      if (opening) {
        await db().from("interviews").update({ status: "live", started_at: new Date().toISOString() }).eq("id", id);
        await db().from("interview_state").update({ phase: "interview" }).eq("interview_id", id);
        await db().from("engagements").update({ status: "interviewing" }).eq("id", iv.engagement_id);
        await log(iv.engagement_id, "room_consent", id, { consented_at: new Date().toISOString(), ua: req.headers.get("user-agent") });
      }
      // Rejoin after a refresh: ask the interviewer to pick up where it left off.
      const turn = await decideTurn(id, { opening });
      return NextResponse.json({ turn, started_at: iv.started_at ?? new Date().toISOString() });
    }
    case "spoken":
      if (b.text) await logBotLine(id, b.text, b.t, b.interrupted);
      return NextResponse.json({ ok: true });
    case "tts": {
      const r = await synthesize(b.text);
      return new NextResponse(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") ?? "audio/mpeg" } });
    }
    case "stream_start": {
      // Every recorder (audio per join, screen per share) gets its own folder + start offset.
      const streams = [...(iv.streams ?? []).filter((s: any) => s.stream !== b.stream), { stream: b.stream, offset_s: b.offset_s }];
      await db().from("interviews").update({ streams }).eq("id", id);
      return NextResponse.json({ ok: true });
    }
    case "end": {
      if (iv.status === "live") {
        await db().from("interviews").update({ status: "done" }).eq("id", id);
        await db().from("interview_state").update({ phase: "ended" }).eq("interview_id", id);
        // Give the last chunk uploads a moment to land before processing starts.
        await enqueue("post_interview", { interview_id: id, chunks: b.chunks }, new Date(Date.now() + 60_000));
        await log(iv.engagement_id, "room_end", id, { reason: b.reason });
      }
      return NextResponse.json({ ok: true });
    }
  }
}
