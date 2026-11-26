import PortalClient from "./PortalClient";

export default async function Portal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortalClient engagementId={id} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} anonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!} />;
}
