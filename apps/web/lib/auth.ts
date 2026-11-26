import { createClient } from "@supabase/supabase-js";
import { db } from "./db";

/** Portal API auth: Supabase access token in Authorization header + org membership. */
export async function requireMember(req: Request, engagementId: string, roles?: string[]) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return null;
  const { data: eng } = await db().from("engagements").select("org_id").eq("id", engagementId).single();
  if (!eng) return null;
  const { data: m } = await db().from("org_members").select("role").eq("org_id", eng.org_id).eq("user_id", user.id).maybeSingle();
  if (!m || (roles && !roles.includes(m.role))) return null;
  return { user, role: m.role as string };
}
