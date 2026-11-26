import Link from "next/link";
import { Accent, BRAND } from "@/components/brand";
import { CtaBand, SERVICE, SiteFooter, SiteNav } from "@/components/site";
import { VIDEO_PRICE } from "@/lib/pricing";

export const metadata = {
  title: "Pricing · Constraint Diagnosis · shule",
  description: "Interviews, docs and the diagnosis are free. Pay only for the remedies you choose to unlock.",
};

const FREE = [
  "Outreach, scheduling and reminders for everyone you name",
  "AI interviews in the browser, with screen sharing",
  "Process docs: an interactive map of each flow and its procedures, with owners and systems",
  "Lean Six Sigma diagnosis: wastes, root causes, missing practices, risk scores and an impact/effort view of every finding",
  "A remedy for each cause, with a DMAIC roadmap and control plan",
  "A questions board, and docs that update as your team answers",
  "Re-run the audit or focus an optimization on one finding",
  "A free preview video for each major problem: current state, wastes and root cause",
];

const VIDEO = [
  "Everything in the free preview, plus the fix",
  "A 3–6 minute animated guide for one improvement",
  "Current state, root cause, future state and the build steps",
  "The real systems, fields, rules and owners involved",
  "A step-by-step build guide you can hand to whoever does the work",
  "A ready-to-paste prompt to implement it with an AI assistant",
  "A control plan so the gains stick",
  "Narration, captions, and an MP4 your team keeps",
];

const FAQ = [
  ["Is the interview and audit really free?", "Yes. The interviews, docs, audit and preview videos cost nothing. You only pay to unlock a full remedy (video, build guide and AI prompt), and only for the ones you choose."],
  ["What if nothing is actually broken?", "Then the diagnosis says so, and looks for what's missing instead. Often the constraint comes from a practice the school never started: teachers found only by word of mouth, no follow-up after tours, no tuition model. Those get a remedy too."],
  ["What's the AI prompt?", "Each unlocked remedy includes a prompt written for that fix, with your systems, fields and rules filled in. Paste it into an AI assistant and it walks your team through building it, step by step."],
  ["What's in the free preview video?", "The current state of the process, the wastes we found and the root cause, so you can see exactly what the problem is. It ends by listing what the full guide covers."],
  ["Why an AI interviewer?", "It can meet each person when it suits them, ask patient follow-up questions, and turn the conversation into docs right away. People can end the interview at any time."],
  ["Who sees the recordings?", "Only the people in your organization you give portal access to. Personal details on screen are blurred automatically, and raw recordings are deleted after 30 days."],
  ["Can we edit the docs?", "Yes. Answer questions in the portal or approve pages as they are. Answers are written back into the docs."],
  ["What if someone isn't comfortable talking to an AI?", "That's completely fine. They agree on screen before starting and can stop at any time, and nothing is recorded unless they begin."],
];

export default function Pricing() {
  return (
    <main>
      <SiteNav />

      <header className="section" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 960, textAlign: "center" }}>
        <span className="eyebrow">Pricing</span>
        <h1 className="h-hero" style={{ marginTop: 20, fontSize: "clamp(40px, 5.5vw, 66px)" }}>Start free. Pay only for the <Accent>remedies</Accent> you want.</h1>
        <p className="muted" style={{ fontSize: 20, maxWidth: 680, margin: "18px auto 0" }}>
          The interviews, docs, diagnosis and preview videos cost nothing. Unlocking a full remedy is the only paid step,
          one at a time. <Link href={SERVICE.how}>How it works →</Link>
        </p>
      </header>

      <section id="pricing" className="section" style={{ paddingTop: 24, maxWidth: 1080 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          <div className="card" style={{ borderRadius: "200px 200px 28px 28px", padding: "72px 32px 32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.violet }}>Interviews, docs and diagnosis</div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-.03em", margin: "8px 0 4px" }}>Free</div>
              <div className="muted">for every process and person you name</div>
            </div>
            <ul style={{ margin: "24px 0 28px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {FREE.map(f => <li key={f}>{f}</li>)}
            </ul>
            <div style={{ textAlign: "center" }}><Link className="btn lg" href={SERVICE.start()}>Start an engagement</Link></div>
          </div>
          <div style={{ background: BRAND.violet, color: "#fff", borderRadius: "200px 200px 28px 28px", padding: "72px 32px 32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.butter }}>Full remedy</div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-.03em", margin: "8px 0 4px" }}>{VIDEO_PRICE}</div>
              <div style={{ color: "#E4DAF5" }}>per remedy · unlock only the ones you want</div>
            </div>
            <ul style={{ margin: "24px 0 28px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {VIDEO.map(f => <li key={f}>{f}</li>)}
            </ul>
            <p style={{ margin: 0, textAlign: "center", color: "#E4DAF5", fontSize: 15 }}>Watch the free preview first, then unlock from your portal.</p>
          </div>
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

      <CtaBand />
      <SiteFooter />
    </main>
  );
}
