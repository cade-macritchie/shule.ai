import { NextResponse } from "next/server";
import { db, enqueue, log } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyCal } from "@/lib/verify";
import { createInterviewBot, deleteBot } from "@/lib/recall";

export const runtime = "nodejs";

type Booking = {
  uid: string; startTime: string; endTime: string;
  attendees: { email: string; name: string }[];
  metadata?: { videoCallUrl?: string };
  location?: string;
  responses?: Record<string, { value?: unknown }>;
};

const zoomUrl = (b: Booking) =>
  [b.metadata?.videoCallUrl, b.location].find(u => typeof u === "string" && /zoom\.us\//.test(u)) ?? null;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyCal(raw, req.headers.get("x-cal-signature-256"), env.calSecret)) return new NextResponse("bad signature", { status: 401 });
  const { triggerEvent, payload } = JSON.parse(raw) as { triggerEvent: string; payload: Booking & { rescheduleUid?: string } };

  if (triggerEvent === "BOOKING_CANCELLED") {
    const { data: iv } = await db().from("interviews").select("id, bot_id, interviewees!inner(booking_uid)")
      .eq("interviewees.booking_uid", payload.uid).maybeSingle();
    if (iv?.bot_id) await deleteBot(iv.bot_id);
    if (iv) await db().from("interviews").update({ status: "cancelled" }).eq("id", iv.id);
    return NextResponse.json({ ok: true });
  }
  if (triggerEvent !== "BOOKING_CREATED" && triggerEvent !== "BOOKING_RESCHEDULED") return NextResponse.json({ ok: true });

  // Match the booker to an invited interviewee by email (the booking link carries ?email= prefill).
  const emails = payload.attendees.map(a => a.email.toLowerCase());
  const { data: person } = await db().from("interviewees").select("*").in("email", emails)
    .in("status", ["invited", "booked"]).order("last_contacted_at", { ascending: false }).limit(1).maybeSingle();
  if (!person) { await log(null, "booking_unmatched", payload.uid, { emails }); return NextResponse.json({ ok: true }); }

  // Default medium is our own browser room; set INTERVIEW_MEDIUM=zoom to send a Recall bot to a Zoom link instead.
  const medium = process.env.INTERVIEW_MEDIUM === "zoom" ? "zoom" : "room";
  const url = medium === "zoom" ? zoomUrl(payload) : null;
  if (medium === "zoom" && !url) { await log(person.engagement_id, "booking_no_zoom", payload.uid); return NextResponse.json({ ok: true }); }

  // A reschedule replaces the old interview (and its bot).
  if (triggerEvent === "BOOKING_RESCHEDULED") {
    const { data: old } = await db().from("interviews").select("id, bot_id").eq("interviewee_id", person.id).eq("status", "scheduled");
    for (const o of old ?? []) { if (o.bot_id) await deleteBot(o.bot_id); await db().from("interviews").update({ status: "cancelled" }).eq("id", o.id); }
  }

  const { data: iv, error } = await db().from("interviews").insert({
    engagement_id: person.engagement_id, interviewee_id: person.id, medium,
    start_at: payload.startTime, end_at: payload.endTime, zoom_url: url,
  }).select("*").single();
  if (error || !iv) throw error;

  const joinAt = new Date(+new Date(payload.startTime) - 60_000);
  if (medium === "zoom") {
    const bot = await createInterviewBot({ interviewId: iv.id, agentToken: iv.agent_token, zoomUrl: url!, joinAt });
    await db().from("interviews").update({ bot_id: bot.id }).eq("id", iv.id);
  }
  await db().from("interview_state").insert({ interview_id: iv.id });
  await db().from("interviewees").update({ status: "booked", booking_uid: payload.uid }).eq("id", person.id);
  await db().from("engagements").update({ status: "scheduled" }).eq("id", person.engagement_id);

  await enqueue("interview_plan", { interview_id: iv.id });
  await enqueue("outreach", { kind: "booking_confirmed", interview_id: iv.id });
  await enqueue("no_show", { interview_id: iv.id }, new Date(+new Date(payload.startTime) + 20 * 60_000));
  await enqueue("outreach", { kind: "pre_call", interview_id: iv.id, when: "24h" }, new Date(+joinAt - 24 * 3600e3));
  await enqueue("outreach", { kind: "pre_call", interview_id: iv.id, when: "1h" }, new Date(+joinAt - 3600e3));
  await log(person.engagement_id, "interview_scheduled", iv.id, { start: payload.startTime });
  return NextResponse.json({ ok: true });
}
