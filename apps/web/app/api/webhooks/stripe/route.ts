// Stripe → payment for a video guide → mark paid → render the full guide.
import { NextResponse } from "next/server";
import { db, enqueue, log } from "@/lib/db";
import { verifyStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripe(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? ""))
    return new NextResponse("bad signature", { status: 400 });
  const evt = JSON.parse(raw) as { type: string; data: { object: any } };
  if (evt.type !== "checkout.session.completed" && evt.type !== "checkout.session.async_payment_succeeded")
    return NextResponse.json({ ok: true });

  const s = evt.data.object;
  if (s.payment_status !== "paid") return NextResponse.json({ ok: true });   // async methods finish later
  const videoId = s.metadata?.video_id;
  const { data: v } = await db().from("videos").select("id, engagement_id, paid, storyboard").eq("id", videoId).single();
  if (!v || v.paid) return NextResponse.json({ ok: true });                 // unknown or already handled (Stripe retries)

  await db().from("videos").update({
    paid: true, paid_at: new Date().toISOString(), status: "paid", stripe_session_id: s.id, price_cents: s.amount_total,
  }).eq("id", v.id);
  await enqueue(v.storyboard ? "render_video" : "storyboard", { video_id: v.id, mode: "full" });
  await log(v.engagement_id, "video_paid", v.id, { session: s.id, amount: s.amount_total, currency: s.currency }, s.customer_details?.email ?? "stripe");
  return NextResponse.json({ ok: true });
}
