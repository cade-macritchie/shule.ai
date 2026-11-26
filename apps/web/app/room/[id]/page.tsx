import { db } from "@/lib/db";
import RoomClient from "./RoomClient";

export const dynamic = "force-dynamic";

export default async function Room({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const { data: iv } = await db().from("interviews")
    .select("id, agent_token, status, start_at, end_at, medium, engagements(intake), interviewees(name)")
    .eq("id", id).single();
  if (!iv || !t || iv.agent_token !== t || iv.medium !== "room")
    return <main className="wrap"><div className="card">This interview link isn't valid. Check the link in your email.</div></main>;

  const eng = iv.engagements as unknown as { intake: { company?: string } } | null;
  const person = iv.interviewees as unknown as { name: string } | null;
  return <RoomClient id={id} token={t} status={iv.status} company={eng?.intake?.company ?? "your organization"}
    name={person?.name ?? ""} startAt={iv.start_at} endAt={iv.end_at} />;
}
