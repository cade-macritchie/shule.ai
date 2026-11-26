function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  get baseUrl() { return req("PUBLIC_BASE_URL").replace(/\/$/, ""); },
  get supabaseUrl() { return req("SUPABASE_URL"); },
  get serviceKey() { return req("SUPABASE_SERVICE_ROLE_KEY"); },
  get anthropicKey() { return req("ANTHROPIC_API_KEY"); },
  get modelLive() { return process.env.CLAUDE_MODEL_LIVE ?? "claude-haiku-5-5"; },
  get calSecret() { return req("CAL_WEBHOOK_SECRET"); },
  get recallKey() { return req("RECALL_API_KEY"); },
  get recallRegion() { return process.env.RECALL_REGION ?? "us-west-2"; },
  get recallSecret() { return req("RECALL_WEBHOOK_SECRET"); },
  get botName() { return process.env.BOT_NAME ?? "ProcessScope Interviewer"; },
  get ttsProvider() { return (process.env.TTS_PROVIDER ?? "elevenlabs") as "elevenlabs" | "openai" | "none"; },
};
