// Portal actions: run an audit/optimization (optionally with a video guide), request a video, answer questions, approve pages.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, enqueue, log } from "@/lib/db";
import { requireMember } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("audit"), pages: z.array(z.string()).optional(), generate_video: z.boolean().default(false) }),
  z.object({ op: z.literal("optimize"), finding_id: z.string().uuid(), generate_video: z.boolean().default(true) }),
  z.object({ op: z.literal("video"), finding_ids: z.array(z.string().uuid()).min(1).max(3) }),
  z.object({ op: z.literal("answer"), answers: z.array(z.object({ id: z.string(), answer: z.string().min(1) })).min(1) }),
  z.object({ op: z.literal("apply_answers") }),
  z.object({ op: z.literal("approve"), path: z.string() }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const who = await requireMember(req, id, ["client_admin", "staff"]);
  if (!who) return new NextResponse("forbidden", { status: 403 });
  const b = Body.parse(await req.json());
  const email = who.user.email ?? who.user.id;

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
    case "approve":
      await db().from("pages").update({ status: "current" }).eq("engagement_id", id).eq("path", b.path);
      await log(id, "approve", b.path, null, email);
      return NextResponse.json({ ok: true });
  }
}
