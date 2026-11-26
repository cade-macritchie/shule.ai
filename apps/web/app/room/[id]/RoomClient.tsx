"use client";
import { useEffect, useRef, useState } from "react";
import { RoomEngine, type RoomState } from "@/lib/roomEngine";

type Line = { who: "you" | "interviewer"; text: string };

export default function RoomClient(p: { id: string; token: string; status: string; company: string; name: string; startAt: string; endAt: string }) {
  const [state, setState] = useState<RoomState>("idle");
  const [agree, setAgree] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [level, setLevel] = useState(0);
  const [screenOn, setScreenOn] = useState(false);
  const [askScreen, setAskScreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const eng = useRef<RoomEngine | null>(null);
  const t0 = useRef(0);
  const bookedMin = Math.round((Date.parse(p.endAt) - Date.parse(p.startAt)) / 60000);
  const first = p.name.split(" ")[0];
  const canScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  useEffect(() => {
    if (state === "idle" || state === "ended") return;
    const h = setInterval(() => {
      const m = (Date.now() - t0.current) / 60000;
      setElapsed(m);
      if (m > bookedMin + 10) eng.current?.end("timeout");   // hard stop 10 min past the booking
    }, 1000);
    return () => clearInterval(h);
  }, [state, bookedMin]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (eng.current && state !== "ended") { e.preventDefault(); } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  async function begin() {
    setErr("");
    const e = new RoomEngine(p.id, p.token, {
      state: setState,
      caption: (who, text) => setLines(l => [...l.slice(-30), { who, text }]),
      level: setLevel,
      askScreen: () => setAskScreen(true),
      screen: on => { setScreenOn(on); if (on) setAskScreen(false); },
      error: setErr,
    });
    eng.current = e;
    t0.current = Date.now();
    try { await e.start(); } catch (x: any) {
      setErr(x?.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser's address bar, then try again." : String(x?.message ?? x));
      setState("error");
    }
  }

  if (p.status !== "scheduled" && p.status !== "live" && state === "idle")
    return <Shell><div className="card"><h2>This interview has {p.status === "done" || p.status === "processed" || p.status === "processing" ? "finished" : `status: ${p.status}`}.</h2><p>Thank you! Nothing else is needed from you.</p></div></Shell>;

  if (state === "ended")
    return <Shell><div className="card"><h2>Thank you, {first}!</h2><p>The interview is complete. {p.company} will receive the process docs and recommendations shortly. You can close this tab.</p></div></Shell>;

  if (state === "idle" || state === "error")
    return (
      <Shell>
        <div className="card" style={{ maxWidth: 620 }}>
          <h2 style={{ marginTop: 0 }}>Hi {first}, welcome to your process interview</h2>
          <p>You'll talk with an <b>AI interviewer</b> for about {bookedMin} minutes about how your work gets done: the steps, the systems, where things wait, and what goes wrong. Just talk naturally; there's no right answer.</p>
          <ul>
            <li>Use <b>Chrome or Edge on a computer</b>, and <b>headphones</b> if you have them.</li>
            <li>Have the systems you use open: you can share your screen to show the interviewer.</li>
            <li>The audio and any screens you share are recorded. Personal details on screen are blurred automatically.</li>
          </ul>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 400 }}>
            <input type="checkbox" style={{ width: "auto", marginTop: 4 }} checked={agree} onChange={e => setAgree(e.target.checked)} />
            I understand I'm speaking with an AI, and I agree to this interview being recorded and transcribed for {p.company}. I can end it at any time.
          </label>
          <button className="btn" style={{ marginTop: 16 }} disabled={!agree} onClick={begin}>{p.status === "live" ? "Rejoin interview" : "Start interview"}</button>
          {err && <p style={{ color: "var(--red)" }}>{err}</p>}
        </div>
      </Shell>
    );

  const label = { listening: "Listening…", thinking: "Thinking…", speaking: "Speaking", ending: "Saving the recording…", idle: "", ended: "", error: "" }[state];
  return (
    <Shell dark>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 0 0 #f5a52499 } 50% { box-shadow: 0 0 0 10px #f5a52400 } }
      `}</style>
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh", padding: 24, gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", opacity: .8 }}>
          <span>ProcessScope · {p.company}</span>
          <span>● REC {Math.floor(elapsed)}:{String(Math.floor((elapsed % 1) * 60)).padStart(2, "0")} / {bookedMin}:00</span>
        </header>
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 24, minHeight: 0 }}>
          <div style={{ display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 200, height: 200, borderRadius: "50%", margin: "0 auto",
                background: "radial-gradient(circle at 35% 35%, #38bdf8, #6366f1 60%, #1e1b4b)",
                boxShadow: state === "speaking" ? "0 0 80px #38bdf8aa" : "0 0 30px #6366f155",
                animation: state === "speaking" ? "pulse .9s ease-in-out infinite" : state === "thinking" ? "spin 3s linear infinite" : "none",
              }} />
              <div style={{ marginTop: 18, fontSize: 22, fontWeight: 600 }}>AI interviewer</div>
              <div style={{ opacity: .7 }}>{label}</div>
              <div style={{ margin: "16px auto 0", width: 180, height: 6, background: "#1e293b", borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, level * 900)}%`, height: "100%", background: muted ? "#64748b" : "#22c55e", borderRadius: 3, transition: "width 80ms" }} />
              </div>
              <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>{muted ? "You're muted" : "Your mic"}</div>
            </div>
          </div>
          <div style={{ overflowY: "auto", background: "#0b1220", borderRadius: 12, padding: 16 }}>
            {lines.map((l, i) => (
              <p key={i} style={{ margin: "0 0 12px", color: l.who === "you" ? "#cbd5e1" : "#fff" }}>
                <b style={{ color: l.who === "you" ? "#94a3b8" : "#38bdf8" }}>{l.who === "you" ? "You" : "Interviewer"}:</b> {l.text}
              </p>
            ))}
          </div>
        </section>
        <footer style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
          {canScreen && (
            <button className="btn" style={{ background: screenOn ? "#334155" : "#4f46e5", animation: askScreen ? "glow 1.2s infinite" : "none" }}
              onClick={() => (screenOn ? eng.current?.stopScreen() : eng.current?.shareScreen().catch(() => setErr("Screen sharing was cancelled.")))}>
              {screenOn ? "Stop sharing" : "🖥️ Share screen"}
            </button>
          )}
          <button className="btn ghost" onClick={() => { setMuted(!muted); eng.current?.setMuted(!muted); }}>{muted ? "Unmute" : "Mute"}</button>
          <button className="btn" style={{ background: "#dc2626" }} disabled={state === "ending"} onClick={() => eng.current?.end("user")}>End interview</button>
          {err && <span style={{ color: "#fca5a5", marginLeft: 12 }}>{err}</span>}
        </footer>
      </div>
    </Shell>
  );
}

function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return dark
    ? <main style={{ background: "#0f172a", color: "#e2e8f0", minHeight: "100vh" }}>{children}</main>
    : <main className="wrap" style={{ paddingTop: 60, display: "grid", placeItems: "center" }}>{children}</main>;
}
