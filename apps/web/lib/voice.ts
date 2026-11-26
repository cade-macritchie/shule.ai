// Text → speech for the bot. Swap providers here (or replace with a speech-to-speech model).
import { env } from "./env";

export async function synthesize(text: string): Promise<Response> {
  switch (env.ttsProvider) {
    case "elevenlabs": {
      const voice = process.env.ELEVENLABS_VOICE_ID!;
      return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?optimize_streaming_latency=3`, {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
      });
    }
    case "openai":
      return fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "alloy", input: text, response_format: "mp3" }),
      });
    default:
      return new Response(null, { status: 204 });
  }
}
