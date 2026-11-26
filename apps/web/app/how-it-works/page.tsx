import Link from "next/link";
import { Accent, BRAND, Logo, StainedGlass, VERSE } from "@/components/brand";
import { VIDEO_PRICE } from "@/lib/pricing";

export const metadata = {
  title: "How it works · shule",
  description: "What happens in a shule engagement, what you get for free, and what video guides cost.",
};

const STEPS = [
  {
    when: "5 minutes", title: "Tell us what to look at",
    body: "Fill in a short form: the processes you want documented, why they matter, and who knows them best. Attach any existing SOPs, screenshots or exports if you have them.",
  },
  {
    when: "Same day", title: "We invite your people",
    body: "Each person gets a friendly email explaining what to expect and a link to book a time that suits them. We send gentle reminders, so you don't have to chase anyone.",
  },
  {
    when: "About 45 minutes each", title: "A conversation with our AI interviewer",
    body: "They join from a link in their browser. No downloads, no Zoom. The interviewer asks how the work really happens: the steps, the systems, where things wait, and what goes wrong. They can share their screen to show it, and stop at any time.",
  },
  {
    when: "After each interview", title: "Your docs and audit appear in your portal",
    body: "We turn the conversation into clear process docs and a Lean Six Sigma audit with prioritized improvements. Anything we couldn't confirm becomes a short question for your team to answer.",
  },
  {
    when: "Whenever you're ready", title: "Add video guides for the fixes you choose",
    body: "Pick any improvement and order a short animated video that walks your team through how to build it, step by step.",
  },
];

const FREE = [
  "Outreach, scheduling and reminders for everyone you name",
  "AI interviews in the browser, with screen sharing",
  "Process docs: an interactive map of each flow and its procedures, with owners and systems",
  "Lean Six Sigma audit: wastes, root causes, risk scores and an impact/effort view of every finding",
  "A DMAIC roadmap and control plan for each finding",
  "A questions board, and docs that update as your team answers",
  "Re-run the audit or focus an optimization on one finding",
];

const VIDEO = [
  "A 3–6 minute animated guide for one improvement",
  "Current state, root cause, future state and the build steps",
  "The real systems, fields, rules and owners involved",
  "A control plan so the gains stick",
  "Narration, captions, and an MP4 your team keeps",
];

const FAQ = [
  ["Is the interview and audit really free?", "Yes. The interviews, docs and audit cost nothing. You only pay if you order a video guide, and only for the videos you choose."],
  ["Why an AI interviewer?", "It can meet each person when it suits them, ask patient follow-up questions, and turn the conversation into docs right away. People can end the interview at any time."],
  ["Who sees the recordings?", "Only the people in your organization you give portal access to. Personal details on screen are blurred automatically, and raw recordings are deleted after 30 days."],
  ["Can we edit the docs?", "Yes. Answer questions in the portal or approve pages as they are. Answers are written back into the docs."],
  ["What if someone isn't comfortable talking to an AI?", "That's completely fine. They agree on screen before starting and can stop at any time, and nothing is recorded unless they begin."],
];

export default function HowItWorks() {
  return (
    <main>
      <nav className="section nav" style={{ paddingTop: 24, paddingBottom: 12 }}>
        <Logo />
        <div className="nav-links">
          <Link href="/">Home</Link>
          <a href="#pricing">Pricing</a>
          <a href="#faq">Questions</a>
          <Link className="btn" href="/start">Get started</Link>
        </div>
      </nav>

      <header className="section" style={{ paddingTop: 40, paddingBottom: 48, maxWidth: 960 }}>
        <span className="eyebrow">How it works</span>
        <h1 className="h-hero" style={{ marginTop: 20 }}>From one conversation to work in <Accent>good order.</Accent></h1>
        <p className="muted" style={{ fontSize: 20, maxWidth: 720 }}>
          Here's exactly what happens when you start an engagement, what your team will be asked to do, and what you get.
          The interviews, docs and audit are <b style={{ color: BRAND.deep }}>free</b>. Video guides are an optional paid add-on.
        </p>
      </header>

      <div className="section"><StainedGlass height={90} /></div>

      <section className="section" style={{ paddingTop: 56, maxWidth: 960 }}>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} className="card" style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: 26 }}>
              <div style={{ width: 52, height: 66, flex: "none", borderRadius: "26px 26px 8px 8px", background: i === 4 ? BRAND.violet : BRAND.blush, color: i === 4 ? "#fff" : "#A8341F", fontWeight: 800, fontSize: 22, display: "grid", placeItems: "center" }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.violet }}>{s.when}</div>
                <h2 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 800 }}>{s.title}</h2>
                <p className="muted" style={{ margin: 0 }}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="section" style={{ paddingTop: 72, maxWidth: 1080 }}>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>What you <Accent>get.</Accent></h2>
        <p className="muted" style={{ textAlign: "center", margin: "0 auto 36px", maxWidth: 620 }}>Start free. Only pay for video guides, one improvement at a time.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          <div className="card" style={{ borderRadius: "200px 200px 28px 28px", padding: "72px 32px 32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.violet }}>Interviews, docs and audit</div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-.03em", margin: "8px 0 4px" }}>Free</div>
              <div className="muted">for every process and person you name</div>
            </div>
            <ul style={{ margin: "24px 0 28px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {FREE.map(f => <li key={f}>{f}</li>)}
            </ul>
            <div style={{ textAlign: "center" }}><Link className="btn lg" href="/start">Start an engagement</Link></div>
          </div>
          <div style={{ background: BRAND.violet, color: "#fff", borderRadius: "200px 200px 28px 28px", padding: "72px 32px 32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.butter }}>Video implementation guides</div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-.03em", margin: "8px 0 4px" }}>{VIDEO_PRICE}</div>
              <div style={{ color: "#E4DAF5" }}>per video · order only the ones you want</div>
            </div>
            <ul style={{ margin: "24px 0 28px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {VIDEO.map(f => <li key={f}>{f}</li>)}
            </ul>
            <p style={{ margin: 0, textAlign: "center", color: "#E4DAF5", fontSize: 15 }}>Order from any finding in your portal after the audit.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 72, maxWidth: 960 }}>
        <div className="cols3">
          {[
            ["Your time", "About 5 minutes for the form, 45 minutes per interview, and a few quick answers afterward."],
            ["Your people's privacy", "Clear AI disclosure and consent up front. Personal details on screen are blurred, and raw recordings are deleted after 30 days."],
            ["Your docs", "Everything we produce is yours to keep, edit and share with your team."],
          ].map(([t, b]) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t}</h3>
              <p className="muted" style={{ margin: 0 }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="section" style={{ paddingTop: 72, maxWidth: 820 }}>
        <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, margin: "0 0 20px" }}>Common <Accent>questions.</Accent></h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQ.map(([q, a]) => (
            <details key={q} className="card" style={{ padding: "18px 22px" }}>
              <summary style={{ fontWeight: 700, fontSize: 18, cursor: "pointer" }}>{q}</summary>
              <p className="muted" style={{ margin: "10px 0 0" }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 72 }}>
        <div style={{ background: BRAND.coral, color: "#fff", borderRadius: 28, padding: 44, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, maxWidth: 760 }}>
            Start free. Your first interview could happen <Accent color="#fff">this week.</Accent>
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
