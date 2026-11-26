"use client";
import { useEffect, useRef, useState } from "react";
import { RoomEngine, type RoomState } from "@/lib/roomEngine";
import { Accent, BRAND, Logo, StainedGlass } from "@/components/brand";

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
    return <Shell><div className="card arch" style={{ paddingTop: 64, maxWidth: 560, textAlign: "center" }}><h2>This interview has {p.status === "done" || p.status === "processed" || p.status === "processing" ? "finished" : `status: ${p.status}`}.</h2><p>Thank you! Nothing else is needed from you.</p></div></Shell>;

  if (state === "ended")
    return <Shell><div className="card arch" style={{ paddingTop: 72, maxWidth: 560, textAlign: "center" }}><h2 style={{ fontSize: 34 }}>Thank you, <Accent>{first}.</Accent></h2><p>The interview is complete. {p.company} will receive the process docs and recommendations shortly. You can close this tab.</p></div></Shell>;

  if (state === "idle" || state === "error")
    return (
      <Shell>
        <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ borderRadius: "24px 24px 0 0", overflow: "hidden" }}><StainedGlass height={48} crop={640} /></div>
        <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 28 }}>
          <h2 style={{ marginTop: 0, fontSize: 30 }}>Hi {first}, welcome to your <Accent>process interview.</Accent></h2>
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
          <button className="btn lg" style={{ marginTop: 16 }} disabled={!agree} onClick={begin}>{p.status === "live" ? "Rejoin interview" : "Start interview"}</button>
          {err && <p style={{ color: "var(--red)" }}>{err}</p>}
        </div>
        </div>
      </Shell>
    );

  const label = { listening: "Listening…", thinking: "Thinking…", speaking: "Speaking", ending: "Saving the recording…", idle: "", ended: "", error: "" }[state];
  return (
    <Shell dark>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 0 0 #FFD27Aaa } 50% { box-shadow: 0 0 0 12px #FFD27A00 } }
      `}</style>
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh", padding: 24, gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", opacity: .8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Logo size={26} light /><span style={{ opacity: .7 }}>· {p.company}</span></span>
          <span>● REC {Math.floor(elapsed)}:{String(Math.floor((elapsed % 1) * 60)).padStart(2, "0")} / {bookedMin}:00</span>
        </header>
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 24, minHeight: 0 }}>
          <div style={{ display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 200, height: 200, borderRadius: "50%", margin: "0 auto",
                background: BRAND.coral,
                boxShadow: state === "speaking" ? "0 0 0 14px rgba(200,64,43,.25), 0 0 60px rgba(255,210,122,.35)" : "0 0 0 9px rgba(200,64,43,.18)",
                animation: state === "speaking" ? "pulse .9s ease-in-out infinite" : state === "thinking" ? "pulse 2.4s ease-in-out infinite" : "none",
              }} />
              <div style={{ marginTop: 18, fontSize: 22, fontWeight: 600 }}>AI interviewer</div>
              <div style={{ opacity: .7 }}>{label}</div>
              <div style={{ margin: "16px auto 0", width: 180, height: 6, background: "rgba(255,248,243,.15)", borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, level * 900)}%`, height: "100%", background: muted ? "#8C94B3" : BRAND.butter, borderRadius: 3, transition: "width 80ms" }} />
              </div>
              <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>{muted ? "You're muted" : "Your mic"}</div>
            </div>
          </div>
          <div style={{ overflowY: "auto", background: "rgba(255,248,243,.06)", borderRadius: 24, padding: 20 }}>
            {lines.map((l, i) => (
              <p key={i} style={{ margin: "0 0 12px", color: l.who === "you" ? "#cbd5e1" : "#fff" }}>
                <b style={{ color: l.who === "you" ? "#C3CBE6" : BRAND.butter }}>{l.who === "you" ? "You" : "Interviewer"}:</b> {l.text}
              </p>
            ))}
          </div>
        </section>
        <footer style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
          {canScreen && (
            <button className="btn" style={{ background: screenOn ? "rgba(255,248,243,.15)" : BRAND.butter, color: screenOn ? BRAND.warm : BRAND.deep, animation: askScreen ? "glow 1.2s infinite" : "none" }}
              onClick={() => (screenOn ? eng.current?.stopScreen() : eng.current?.shareScreen().catch(() => setErr("Screen sharing was cancelled.")))}>
              {screenOn ? "Stop sharing" : "Share screen"}
            </button>
          )}
          <button className="btn ghost" onClick={() => { setMuted(!muted); eng.current?.setMuted(!muted); }}>{muted ? "Unmute" : "Mute"}</button>
          <button className="btn" disabled={state === "ending"} onClick={() => eng.current?.end("user")}>End interview</button>
          {err && <span style={{ color: BRAND.rose, marginLeft: 12 }}>{err}</span>}
        </footer>
      </div>
    </Shell>
  );
}

function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return dark
    ? <main style={{ background: BRAND.deep, color: BRAND.warm, minHeight: "100vh" }}>{children}</main>
    : <main className="wrap" style={{ paddingTop: 60, display: "grid", placeItems: "center" }}>{children}</main>;
}
