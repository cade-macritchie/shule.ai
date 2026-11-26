// Recording chunks from the room's MediaRecorders (~5 s each), stored privately:
//   <eng>/<interview>/room/audio-<sid>/000001.webm      mixed mic + interviewer voice (one folder per join)
//   <eng>/<interview>/room/screen-<sid>-2/000001.webm   one folder per screen-share session
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roomAuth, roomKey, STREAM } from "@/lib/room";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await roomAuth(req, id);
  if (!iv || !["live", "done"].includes(iv.status)) return new NextResponse("forbidden", { status: 403 });
  const u = new URL(req.url);
  const stream = u.searchParams.get("stream") ?? "";
  const seq = Number(u.searchParams.get("seq"));
  if (!STREAM.test(stream) || !Number.isInteger(seq) || seq < 1 || seq > 99999) return new NextResponse("bad chunk", { status: 400 });

  const body = await req.arrayBuffer();
  if (body.byteLength > 4_000_000) return new NextResponse("too large", { status: 413 }); // stays under serverless body limits
  const { error } = await db().storage.from("media")
    .upload(roomKey(iv, `${stream}/${String(seq).padStart(6, "0")}.webm`), body, { contentType: "video/webm", upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
