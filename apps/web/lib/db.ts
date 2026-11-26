import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let admin: SupabaseClient | null = null;
/** Service-role client: server code only (webhooks, API routes). */
export function db(): SupabaseClient {
  admin ??= createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });
  return admin;
}

export async function enqueue(kind: string, payload: Record<string, unknown>, runAfter?: Date) {
  const { error } = await db().from("jobs").insert({ kind, payload, run_after: (runAfter ?? new Date()).toISOString() });
  if (error) throw error;
}

export async function log(engagement_id: string | null, action: string, target?: string, detail?: unknown, who = "system") {
  await db().from("activity").insert({ engagement_id, action, target, detail, who });
}

/** Push a live event to the agent page (camera/mic of the bot). */
export async function broadcast(interviewId: string, event: string, payload: Record<string, unknown>) {
  const ch = db().channel(`interview:${interviewId}`);
  await ch.send({ type: "broadcast", event, payload });
  await db().removeChannel(ch);
}
