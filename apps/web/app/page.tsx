import Link from "next/link";
import { Accent, BRAND, Logo, StainedGlass, VERSE } from "@/components/brand";

const STEPS = [
  { n: 1, title: "Name the work", body: "Tell us the processes and the people who carry them. We handle invitations, booking and reminders.", bg: BRAND.blush, fg: "#A8341F" },
  { n: 2, title: "Just talk", body: "A patient AI interviewer listens, asks good follow-ups, and lets you share your screen to show the real thing.", bg: "#EDE6F6", fg: "#4A2F7A" },
  { n: 3, title: "Bring it into good order", body: "Docs, a prioritized audit, and a video for each big fix, ready in your team portal.", bg: "#FFF0CC", fg: "#7A5200" },
];

const DELIVERABLES = [
  { title: "Docs your team will use", body: "An interactive process map with owners, systems and open questions, kept current as answers come in.", bg: BRAND.blush, fg: BRAND.deep, sub: BRAND.ink2 },
  { title: "An audit that shows its work", body: "Lean Six Sigma made practical: wastes, root causes, risk scores and where to start, each backed by a quote from the interview.", bg: BRAND.butter, fg: BRAND.deep, sub: BRAND.deep },
  { title: "Videos that teach the fix", body: "Short animated guides with the actual build steps, systems and owners for every major problem.", bg: BRAND.violet, fg: "#fff", sub: "#E4DAF5" },
];

const SERVE = ["Christian K–12 and classical schools", "Christian colleges and universities", "Seminaries", "Churches and ministry offices"];

export default function Home() {
  return (
    <main>
      <nav className="section nav" style={{ paddingTop: 24, paddingBottom: 12 }}>
        <Logo />
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#deliver">What you get</a>
          <a href="#who">Who we serve</a>
          <Link className="btn" href="/start">Get started</Link>
        </div>
      </nav>

      <header className="section hero" style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span className="eyebrow" style={{ alignSelf: "flex-start" }}>For Christian schools, colleges, seminaries and ministries</span>
          <h1 className="h-hero">Steward the work behind the <Accent>mission.</Accent></h1>
          <p className="muted" style={{ margin: 0, fontSize: 20, maxWidth: 600 }}>
            A 45-minute conversation with our AI interviewer becomes living docs, a Lean Six Sigma audit, and step-by-step
            videos for the biggest fixes, so your people spend less time on busywork and more time on students.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link className="btn lg" href="/start">Start an engagement</Link>
            <a className="btn ghost lg" href="#how">How it works</a>
          </div>
        </div>
        <div className="arch" style={{ background: BRAND.deep, color: BRAND.warm, padding: "96px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: BRAND.coral, boxShadow: "0 0 0 9px rgba(200,64,43,.25)" }} />
            <div><div style={{ fontWeight: 800, fontSize: 18 }}>AI interviewer</div><div style={{ fontSize: 14, color: "#C3CBE6" }}>Listening…</div></div>
          </div>
          <div style={{ background: "rgba(255,248,243,.08)", borderRadius: 18, padding: 16 }}>
            <b style={{ color: BRAND.butter }}>Interviewer:</b> After a family enrolls, what's the very first thing your office does?
          </div>
          <div style={{ background: "rgba(255,248,243,.08)", borderRadius: 18, padding: 16 }}>
            <b style={{ color: "#C3CBE6" }}>You:</b> We send the welcome packet, but first someone has to check the tuition agreement came back.
          </div>
        </div>
      </header>

      <div className="section"><StainedGlass /></div>

      <section id="how" className="section" style={{ paddingTop: 56 }}>
        <div className="card cols3" style={{ padding: 40, borderRadius: 28 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="arch-sm" style={{ width: 48, height: 60, background: s.bg, color: s.fg, fontWeight: 800, fontSize: 20, display: "grid", placeItems: "center", borderRadius: "24px 24px 8px 8px" }}>{s.n}</div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{s.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="deliver" className="section cols3" style={{ paddingTop: 56, paddingBottom: 40 }}>
        {DELIVERABLES.map(d => (
          <div key={d.title} style={{ background: d.bg, color: d.fg, borderRadius: "120px 120px 24px 24px", padding: "64px 28px 30px", textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{d.title}</h3>
            <p style={{ margin: 0, color: d.sub }}>{d.body}</p>
          </div>
        ))}
      </section>

      <section id="who" className="section" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingBottom: 48 }}>
        {SERVE.map(s => <span key={s} style={{ border: "1px solid #E5D3C6", borderRadius: 999, padding: "10px 18px", fontWeight: 600, fontSize: 15 }}>{s}</span>)}
      </section>

      <section className="section">
        <div style={{ background: BRAND.coral, color: "#fff", borderRadius: 28, padding: 44, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, maxWidth: 760 }}>
            Your first process interview could happen <Accent color="#fff">this week.</Accent>
          </h2>
          <Link className="btn lg" href="/start" style={{ background: BRAND.warm, color: BRAND.deep }}>Start an engagement</Link>
        </div>
      </section>

      <footer className="section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "36px 24px 48px", fontSize: 14 }}>
        <span className="muted">© shule · Process interviews, docs and improvement for education and ministry</span>
        <span className="accent" style={{ fontSize: 20, color: BRAND.violet }}>“{VERSE.text}” {VERSE.ref}</span>
      </footer>
    </main>
  );
}
