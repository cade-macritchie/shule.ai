// Speech → text for one utterance (16 kHz mono WAV from the room's voice detector).
// Pre-recorded REST transcription is fast enough because each utterance is short (usually 2–20 s).

// Product names the model would otherwise mishear (same idea as VOCAB in the video pipeline).
const VOCAB = (process.env.STT_VOCAB ?? "Slate, Jenzabar, Caspio, Raiser's Edge, Constituo, Banner, Salesforce, PowerSchool")
  .split(",").map(s => s.trim()).filter(Boolean);

export async function transcribe(wav: Blob): Promise<string> {
  const provider = process.env.STT_PROVIDER ?? (process.env.DEEPGRAM_API_KEY ? "deepgram" : "openai");
  if (provider === "deepgram") {
    const q = new URLSearchParams({ model: "nova-3", smart_format: "true", language: "en" });
    for (const k of VOCAB) q.append("keyterm", k);
    const r = await fetch(`https://api.deepgram.com/v1/listen?${q}`, {
      method: "POST", headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "Content-Type": "audio/wav" }, body: wav,
    });
    if (!r.ok) throw new Error(`deepgram ${r.status}: ${await r.text()}`);
    const j = await r.json() as any;
    return (j.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "").trim();
  }
  const form = new FormData();
  form.set("file", wav, "utterance.wav");
  form.set("model", process.env.OPENAI_STT_MODEL ?? "gpt-4o-transcribe");
  form.set("language", "en");
  form.set("prompt", `Process interview at an organization. Systems mentioned may include: ${VOCAB.join(", ")}.`);
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  });
  if (!r.ok) throw new Error(`openai stt ${r.status}: ${await r.text()}`);
  return ((await r.json()) as { text: string }).text.trim();
}

/** Whisper-style models invent text on silence/noise; drop the usual suspects. */
export function isJunk(text: string) {
  const t = text.toLowerCase().replace(/[^a-z ]/g, "").trim();
  return !t || /^(thank you|thanks for watching|you|bye|uh|um|hmm)$/.test(t);
}
