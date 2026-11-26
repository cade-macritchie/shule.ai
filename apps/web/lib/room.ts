import { db } from "./db";

/** Room requests carry ?t=<agent_token>; the token is the interviewee's link secret. */
export async function roomAuth(req: Request, id: string) {
  const t = new URL(req.url).searchParams.get("t");
  if (!t) return null;
  const { data } = await db().from("interviews")
    .select("id, engagement_id, agent_token, status, start_at, end_at, started_at, medium, streams")
    .eq("id", id).single();
  if (!data || data.agent_token !== t || data.medium !== "room") return null;
  return data;
}

export const roomKey = (iv: { engagement_id: string; id: string }, path: string) => `${iv.engagement_id}/${iv.id}/room/${path}`;

/** Recorder folder names: audio-<sid> per join, screen-<sid>-<n> per screen share. */
export const STREAM = /^(audio-[a-z0-9]{6}|screen-[a-z0-9]{6}-\d{1,3})$/;
