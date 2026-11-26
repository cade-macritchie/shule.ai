// One finished utterance from the room: WAV → text → interviewer turn → reply.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roomAuth } from "@/lib/room";
import { transcribe, isJunk } from "@/lib/stt";
import { decideTurn } from "@/lib/interviewer";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await roomAuth(req, id);
  if (!iv || iv.status !== "live") return new NextResponse("forbidden", { status: 403 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size < 2000 || audio.size > 4_000_000) return NextResponse.json({ heard: "", turn: null });
  const t_start = Number(form.get("t_start") ?? 0);
  const t_end = Number(form.get("t_end") ?? t_start);
  // reply=false: the person kept talking, so store the text but let the next utterance take the turn.
  const reply = form.get("reply") !== "false";

  const heard = await transcribe(audio);
  if (isJunk(heard)) return NextResponse.json({ heard: "", turn: null });

  const { data: person } = await db().from("interviews").select("interviewees(name)").eq("id", id).single();
  await db().from("interview_utterances").insert({
    interview_id: id, speaker: (person as any)?.interviewees?.name ?? "Interviewee", is_bot: false, text: heard, t_start, t_end,
  });
  const turn = reply ? await decideTurn(id) : null;
  return NextResponse.json({ heard, turn });
}
