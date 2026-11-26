import AgentClient from "./AgentClient";

// This page IS the bot's camera + microphone: Recall loads it in a headless browser
// and streams its video/audio into the Zoom call.
export default async function AgentPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  return <AgentClient interviewId={id} token={t ?? ""}
    supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} anonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!} />;
}
