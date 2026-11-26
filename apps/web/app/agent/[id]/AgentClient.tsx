"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Mode = "idle" | "speaking" | "thinking";

export default function AgentClient(p: { interviewId: string; token: string; supabaseUrl: string; anonKey: string }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [caption, setCaption] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<{ text: string; leaveAfter: boolean }[]>([]);
  const busy = useRef(false);

  const api = (body: object) =>
    fetch(`/api/agent?i=${p.interviewId}&t=${p.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  async function playNext() {
    if (busy.current) return;
    const item = queue.current.shift();
    if (!item) return;
    busy.current = true;
    setCaption(item.text); setMode("speaking");
    api({ op: "speaking", value: true });
    try {
      const r = await api({ op: "tts", text: item.text });
      if (r.status === 200) {
        const url = URL.createObjectURL(await r.blob());
        const a = new Audio(url);
        audio.current = a;
        await new Promise<void>(res => { a.onended = () => res(); a.onpause = () => res(); a.play().catch(() => res()); });
        URL.revokeObjectURL(url);
      } else {
        await new Promise(res => setTimeout(res, Math.min(8000, item.text.length * 55))); // no TTS: show caption only
      }
    } finally {
      busy.current = false; audio.current = null;
      setMode("idle"); api({ op: "speaking", value: false });
      if (item.leaveAfter) { await new Promise(r => setTimeout(r, 1200)); api({ op: "leave" }); }
      else playNext();
    }
  }

  useEffect(() => {
    const sb = createClient(p.supabaseUrl, p.anonKey);
    const ch = sb.channel(`interview:${p.interviewId}`)
      .on("broadcast", { event: "say" }, ({ payload }) => {
        setChip(payload.chip ?? null);
        queue.current.push({ text: payload.text, leaveAfter: !!payload.leaveAfter });
        playNext();
      })
      .on("broadcast", { event: "stop" }, () => { queue.current = []; audio.current?.pause(); })
      .on("broadcast", { event: "thinking" }, () => setMode("thinking"))
      .subscribe();
    return () => { sb.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ width: "100vw", height: "100vh", background: "#1B2B5B", color: "#FFF8F3", display: "grid", placeItems: "center", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.12); opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 220, height: 220, borderRadius: "50%", margin: "0 auto",
          background: "#C8402B",
          boxShadow: mode === "speaking" ? "0 0 0 16px rgba(200,64,43,.25), 0 0 70px rgba(255,210,122,.35)" : "0 0 0 10px rgba(200,64,43,.18)",
          animation: mode === "speaking" ? "pulse .9s ease-in-out infinite" : mode === "thinking" ? "pulse 2.4s ease-in-out infinite" : "none",
        }} />
        <div style={{ marginTop: 28, fontSize: 30, fontWeight: 800, fontFamily: "Plus Jakarta Sans, sans-serif" }}>shule interviewer</div>
        <div style={{ marginTop: 6, fontSize: 18, opacity: .6 }}>AI interviewer · this call is recorded</div>
        {chip && <div style={{ marginTop: 20, display: "inline-block", padding: "8px 18px", borderRadius: 999, background: "#FFD27A", color: "#1B2B5B", fontWeight: 700, fontSize: 20 }}>{chip}</div>}
        <div style={{ marginTop: 36, maxWidth: 1100, minHeight: 90, fontSize: 28, lineHeight: 1.35, padding: "0 60px" }}>{mode === "speaking" ? caption : ""}</div>
      </div>
    </main>
  );
}
