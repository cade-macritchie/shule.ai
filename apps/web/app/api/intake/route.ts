import { NextResponse } from "next/server";
import { z } from "zod";
import { db, enqueue, log } from "@/lib/db";

export const runtime = "nodejs";

const Intake = z.object({
  company: z.string().min(2).max(120),
  contact_name: z.string().min(2),
  contact_email: z.string().email(),
  processes: z.string().min(10).max(4000),   // "what should we look at, and why"
  goals: z.string().max(2000).optional(),
  interviewees: z.array(z.object({ name: z.string().min(2), email: z.string().email(), role: z.string().optional() })).min(1).max(8),
  video_policy: z.enum(["major", "all", "none"]).default("major"),
});

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = Intake.safeParse(JSON.parse(String(form.get("intake") ?? "{}")));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const i = parsed.data;

  const { data: org, error: oe } = await db().from("orgs")
    .insert({ name: i.company, slug: `${slug(i.company)}-${crypto.randomUUID().slice(0, 6)}` }).select().single();
  if (oe) throw oe;
  const { data: eng, error: ee } = await db().from("engagements").insert({
    org_id: org.id, title: `${i.company} process review`, intake: i, video_policy: i.video_policy, status: "outreach",
  }).select().single();
  if (ee) throw ee;

  // Attachments → private storage; the worker extracts text/images when it builds the interview plan.
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files.slice(0, 10)) {
    if (f.size > 25 * 1024 * 1024) continue;
    await db().storage.from("media").upload(`${eng.id}/intake/${f.name}`, f, { contentType: f.type, upsert: true });
  }

  await db().from("interviewees").insert(i.interviewees.map(p => ({ ...p, engagement_id: eng.id })));
  await enqueue("outreach", { kind: "invite", engagement_id: eng.id });
  await enqueue("invite_client", { engagement_id: eng.id, email: i.contact_email }); // portal magic link
  await log(eng.id, "intake", eng.id, { interviewees: i.interviewees.length, files: files.length }, i.contact_email);
  return NextResponse.json({ engagement_id: eng.id });
}
