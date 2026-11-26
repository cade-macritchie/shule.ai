// Portal actions: run an audit/optimization (optionally with a video guide), request a video, answer questions, approve pages.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, enqueue, log } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { createVideoCheckout } from "@/lib/stripe";
import { VIDEO_PRICE_CENTS } from "@/lib/pricing";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("audit"), pages: z.array(z.string()).optional(), generate_video: z.boolean().default(false) }),
  z.object({ op: z.literal("optimize"), finding_id: z.string().uuid(), generate_video: z.boolean().default(true) }),
  z.object({ op: z.literal("video"), finding_ids: z.array(z.string().uuid()).min(1).max(3) }),
  z.object({ op: z.literal("answer"), answers: z.array(z.object({ id: z.string(), answer: z.string().min(1) })).min(1) }),
  z.object({ op: z.literal("apply_answers") }),
  z.object({ op: z.literal("approve"), path: z.string() }),
  z.object({ op: z.literal("checkout"), video_id: z.string().uuid() }),
  z.object({ op: z.literal("video_url"), video_id: z.string().uuid(), which: z.enum(["preview", "full"]) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const who = await requireMember(req, id);
  if (!who) return new NextResponse("forbidden", { status: 403 });
  const b = Body.parse(await req.json());
  const email = who.user.email ?? who.user.id;
  // Viewers may watch; everything else needs an admin.
  if (b.op !== "video_url" && !["client_admin", "staff"].includes(who.role)) return new NextResponse("forbidden", { status: 403 });

  switch (b.op) {
    case "audit":
    case "optimize": {
      const { data: a } = await db().from("audits").insert({
        engagement_id: id, kind: b.op === "audit" ? "audit" : "optimization",
        scope: b.op === "audit" ? { pages: b.pages ?? null } : { finding_id: b.finding_id },
        generate_video: b.generate_video,
      }).select("id").single();
      await enqueue("lss_audit", { audit_id: a!.id });
      await log(id, b.op, a!.id, { generate_video: b.generate_video }, email);
      return NextResponse.json({ audit_id: a!.id });
    }
    case "video": {
      const { data: v } = await db().from("videos").insert({ engagement_id: id, finding_ids: b.finding_ids }).select("id").single();
      await enqueue("storyboard", { video_id: v!.id });
      return NextResponse.json({ video_id: v!.id });
    }
    case "answer":
      for (const a of b.answers)
        await db().from("questions").update({ answer: a.answer, answered_by: email, answered_at: new Date().toISOString(), status: "answered" })
          .eq("id", a.id).eq("engagement_id", id);
      return NextResponse.json({ ok: true });
    case "apply_answers":
      await enqueue("apply_answers", { engagement_id: id, by: email });
      return NextResponse.json({ ok: true });
    case "checkout": {
      if (!VIDEO_PRICE_CENTS) return NextResponse.json({ error: "Video price isn't set (NEXT_PUBLIC_VIDEO_PRICE_CENTS)." }, { status: 400 });
      const { data: v } = await db().from("videos").select("id, title, paid").eq("id", b.video_id).eq("engagement_id", id).single();
      if (!v) return new NextResponse("not found", { status: 404 });
      if (v.paid) return NextResponse.json({ error: "Already unlocked." }, { status: 409 });
      const session = await createVideoCheckout({
        videoId: v.id, engagementId: id, title: v.title ?? "Implementation guide", email: who.user.email,
        cents: VIDEO_PRICE_CENTS, returnUrl: `${process.env.PUBLIC_BASE_URL}/portal/${id}`,
      });
      await db().from("videos").update({ stripe_session_id: session.id }).eq("id", v.id);
      await log(id, "checkout_started", v.id, { session: session.id }, email);
      return NextResponse.json({ url: session.url });
    }
    case "video_url": {
      const { data: v } = await db().from("videos").select("*").eq("id", b.video_id).eq("engagement_id", id).single();
      if (!v) return new NextResponse("not found", { status: 404 });
      if (b.which === "full" && !(v.paid && v.mp4_path)) return NextResponse.json({ error: "locked" }, { status: 402 });
      const mp4 = b.which === "full" ? v.mp4_path : v.preview_path;
      const vtt = b.which === "full" ? v.srt_path?.replace(/\.srt$/, ".vtt") : v.preview_vtt_path;
      if (!mp4) return NextResponse.json({ error: "not ready" }, { status: 409 });
      const sign = async (p?: string | null) => (p ? (await db().storage.from("videos").createSignedUrl(p, 3600)).data?.signedUrl ?? null : null);
      return NextResponse.json({ mp4: await sign(mp4), vtt: await sign(vtt) });
    }
    case "approve":
      await db().from("pages").update({ status: "current" }).eq("engagement_id", id).eq("path", b.path);
      await log(id, "approve", b.path, null, email);
      return NextResponse.json({ ok: true });
  }
}
