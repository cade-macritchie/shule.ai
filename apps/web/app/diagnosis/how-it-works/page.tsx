import { Accent, BRAND } from "@/components/brand";
import { DELIVERABLE_ART } from "@/components/DeliverableArt";
import { CtaBand, H2, SERVICE, SiteFooter, SiteNav } from "@/components/site";
import { CONSTRAINTS } from "@/lib/constraints";
import Link from "next/link";

export const metadata = {
  title: "How it works · Constraint Diagnosis · shule",
  description: "What happens in a Constraint Diagnosis engagement, from the first form to the remedy, and what you get at each step.",
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
    when: "After each interview", title: "Your docs and diagnosis appear in your portal",
    body: "We turn the conversation into clear process docs and a Lean Six Sigma diagnosis of what is holding your constraint in place. That covers broken steps and missing practices: hiring that runs only on word of mouth is a cause, even if nothing is technically broken. Each cause gets a remedy, ranked by impact. Anything we couldn't confirm becomes a short question for your team.",
  },
  {
    when: "Free preview, then your choice", title: "Watch a free preview, unlock the remedy",
    body: "Each major problem comes with a free preview video that shows what's happening and why. When you want the fix, unlock the full remedy: the video guide, a step-by-step build guide, and a ready-to-paste prompt so your team can implement it with an AI assistant.",
  },
];

const DELIVERABLES = [
  { k: "Docs", title: "Docs your team will use", body: "An interactive map of how the work really runs, with owners, systems and open questions, kept current as answers come in.", bg: BRAND.blush, fg: BRAND.deep, sub: BRAND.ink2 },
  { k: "Diagnosis", title: "An audit aimed at your constraint", body: "Wastes, root causes, missing practices and risk scores, each tied to the constraint it holds back and backed by a quote from the interview.", bg: BRAND.butter, fg: BRAND.deep, sub: BRAND.deep },
  { k: "Remedy", title: "Videos that teach the fix", body: "A short animated guide for each major remedy: what changes, why, and what it looks like when it's working. Free preview first.", bg: BRAND.violet, fg: "#fff", sub: "#E4DAF5" },
  { k: "Build it", title: "A step-by-step guide and an AI prompt", body: "Numbered build steps for each remedy, plus a ready-to-paste prompt so your team can implement it with an AI assistant.", bg: BRAND.deep, fg: "#fff", sub: "#D9DEEC" },
];

export default function HowItWorks() {
  return (
    <main>
      <SiteNav />

      <header className="section" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 960 }}>
        <span className="eyebrow">How it works</span>
        <h1 className="h-hero" style={{ marginTop: 20 }}>From one conversation to work in <Accent>good order.</Accent></h1>
        <p className="muted" style={{ fontSize: 20, maxWidth: 720 }}>
          What happens when you start, what your team is asked to do, and what you get at each step.
        </p>
      </header>

      <div className="section"><div className="beam-rule" /></div>

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

      <section id="missing" className="section" style={{ paddingTop: 72 }}>
        <H2>Broken, or <Accent>missing?</Accent></H2>
        <p className="muted" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 28px", fontSize: 18 }}>
          Sometimes the process works fine and the constraint comes from something the school has never started doing.
          The diagnosis looks for both: what to fix, and what to begin.
        </p>
        <div className="tex-chalk" style={{ borderRadius: 28, padding: 20, boxShadow: "inset 0 0 0 8px #6B4226, inset 0 0 60px rgba(0,0,0,.45)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, padding: 12 }}>
            {CONSTRAINTS.map(m => (
              <Link key={m.id} href={SERVICE.constraint(m.id)} style={{ background: "rgba(255,248,243,.96)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "inherit" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BRAND.deep }}>{m.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: BRAND.ink2 }}><b style={{ color: BRAND.coral }}>Fix what's broken:</b> {m.broken}</p>
                <p style={{ margin: 0, fontSize: 14, color: BRAND.ink2 }}><b style={{ color: BRAND.violet }}>Start what's missing:</b> {m.missing}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="deliver" className="section" style={{ paddingTop: 72 }}>
        <H2>From diagnosis to <Accent>remedy.</Accent></H2>
        <p className="muted" style={{ textAlign: "center", margin: "0 auto 28px", maxWidth: 600, fontSize: 18 }}>What you get. <Link href={SERVICE.pricing}>See what's free and what isn't →</Link></p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
          {DELIVERABLES.map((d, i) => { const Art = DELIVERABLE_ART[i]; return (
            <div key={d.title} style={{ background: d.bg, color: d.fg, borderRadius: "120px 120px 24px 24px", padding: "48px 20px 28px", textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 20px rgba(27,43,91,.14)", marginBottom: 6 }}><Art /></div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: d.sub, opacity: .85 }}>{i + 1} · {d.k}</div>
              <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>{d.title}</h3>
              <p style={{ margin: 0, color: d.sub }}>{d.body}</p>
            </div>
          ); })}
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

      <CtaBand />
      <SiteFooter />
    </main>
  );
}
