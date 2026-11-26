// Calls from the agent page (running inside Recall's bot browser). Token-checked.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { synthesize } from "@/lib/voice";
import { leaveCall } from "@/lib/recall";

export const runtime = "nodejs";

async function check(id: string | null, token: string | null) {
  if (!id || !token) return null;
  const { data } = await db().from("interviews").select("id, bot_id, agent_token").eq("id", id).single();
  return data && data.agent_token === token ? data : null;
}

export async function POST(req: Request) {
  const u = new URL(req.url);
  const iv = await check(u.searchParams.get("i"), u.searchParams.get("t"));
  if (!iv) return new NextResponse("forbidden", { status: 403 });
  const body = await req.json() as { op: "tts"; text: string } | { op: "speaking"; value: boolean } | { op: "leave" };

  if (body.op === "tts") {
    const r = await synthesize(body.text.slice(0, 1200));
    return new NextResponse(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") ?? "audio/mpeg" } });
  }
  if (body.op === "speaking") {
    await db().from("interview_state").update({ bot_speaking: body.value }).eq("interview_id", iv.id);
    return NextResponse.json({ ok: true });
  }
  if (body.op === "leave" && iv.bot_id) await leaveCall(iv.bot_id);
  return NextResponse.json({ ok: true });
}
