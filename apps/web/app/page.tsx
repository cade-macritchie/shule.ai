import Image from "next/image";
import Link from "next/link";
import { Accent, BRAND, Logo, VERSE } from "@/components/brand";
import { CONSTRAINTS } from "@/lib/constraints";
import { DELIVERABLE_ART } from "@/components/DeliverableArt";
import bellImg from "./textures/school-bell.webp";

const STEPS = [
  { n: 1, title: "Name your constraint", body: "Tell us what's holding the school back and who knows that work best. We handle invitations, booking and reminders.", bg: BRAND.blush, fg: "#A8341F" },
  { n: 2, title: "Your people just talk", body: "A patient AI interviewer asks how the work really runs, where it waits and what goes wrong. Screen sharing welcome.", bg: "#EDE6F6", fg: "#4A2F7A" },
  { n: 3, title: "Fix the right thing first", body: "A diagnosis of what is really holding the constraint in place, with the evidence, then a remedy for each cause, ranked by how much it frees the constraint.", bg: "#FFF0CC", fg: "#7A5200" },
];

const DELIVERABLES = [
  { k: "Docs", title: "Docs your team will use", body: "An interactive map of how the work really runs, with owners, systems and open questions, kept current as answers come in.", bg: BRAND.blush, fg: BRAND.deep, sub: BRAND.ink2 },
  { k: "Diagnosis", title: "An audit aimed at your constraint", body: "Wastes, root causes, missing practices and risk scores, each tied to the constraint it holds back and backed by a quote from the interview.", bg: BRAND.butter, fg: BRAND.deep, sub: BRAND.deep },
  { k: "Remedy", title: "Videos that teach the fix", body: "A short animated guide for each major remedy: what changes, why, and what it looks like when it's working. Free preview first.", bg: BRAND.violet, fg: "#fff", sub: "#E4DAF5" },
  { k: "Build it", title: "A step-by-step guide and an AI prompt", body: "Numbered build steps for each remedy, plus a ready-to-paste prompt so your team can implement it with an AI assistant.", bg: BRAND.deep, fg: "#fff", sub: "#D9DEEC" },
];

// Not every constraint comes from a broken process. Often it's a practice the school never started.
const MISSING = [
  { c: "Can't find good teachers", broken: "Applications sit in an inbox for two weeks", missing: "Hiring runs on word of mouth: no LinkedIn presence, no Christian-college pipeline, no referral program" },
  { c: "Not enough students", broken: "Inquiries wait days for a first reply", missing: "No follow-up after tours, and no ambassador families telling their friends" },
  { c: "Students aren't profitable", broken: "Aid is decided case by case, late, by email", missing: "No tuition model: nobody knows the real cost to serve one student" },
  { c: "Don't know your CAC", broken: "Inquiry source is typed in three different ways", missing: "Marketing and recruiting spend are never tied to the families they brought in" },
];


const SERVE = ["Christian K–12 and classical schools", "Christian colleges and universities", "Seminaries", "Churches and ministry offices"];
const TINTS = [[BRAND.blush, "#A8341F"], ["#EDE6F6", "#4A2F7A"], ["#FFF0CC", "#7A5200"], [BRAND.blush, "#A8341F"], ["#EDE6F6", "#4A2F7A"]];

export default function Home() {
  return (
    <main>
      <nav className="section nav" style={{ paddingTop: 24, paddingBottom: 12 }}>
        <Logo />
        <div className="nav-links">
          <a href="#constraints">Constraints</a>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/how-it-works#pricing">Pricing</Link>
          <Link className="btn" href="/start">Start free</Link>
        </div>
      </nav>

      <header className="section hero" style={{ paddingTop: 32, paddingBottom: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="eyebrow" style={{ alignSelf: "flex-start" }}>For Christian schools, colleges and seminaries</span>
          <h1 className="h-hero">Find the constraint holding your <Accent>mission</Accent> back.</h1>
          <p className="muted" style={{ margin: 0, fontSize: 20, maxWidth: 620 }}>
            Every school is limited by something: too few students, thin margins, teaching roles you can't fill, an
            experience bigger schools outspend you on, or not knowing what a student costs to win. One conversation
            with the people who do the work shows where it's stuck and what to fix first. Free.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link className="btn lg" href="/start">Find my constraint</Link>
            <Link className="btn ghost lg" href="/how-it-works">How it works</Link>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div aria-hidden className="hero-board tex-chalk" />
          <Image src={bellImg} alt="A brass school hand bell, mid-ring" priority sizes="(max-width: 900px) 70vw, 440px"
            style={{ position: "relative", width: "min(100%, 440px)", height: "auto", filter: "drop-shadow(0 30px 36px rgba(10,14,30,.35))" }} />
          <div className="card" style={{ position: "absolute", left: 0, bottom: 4, maxWidth: 260, padding: 16, borderRadius: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.violet }}>Constraint found</div>
            <div style={{ fontWeight: 800, margin: "4px 0" }}>Deposit → registration handoff</div>
            <div className="muted" style={{ fontSize: 14 }}>Admitted students wait 6–9 days for an ID. Fix first: a nightly automated handoff.</div>
          </div>
        </div>
      </header>

      <div className="section"><div className="beam-rule" /></div>

      <section id="constraints" className="section" style={{ paddingTop: 64 }}>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, margin: "0 0 8px", textAlign: "center" }}>Which constraint is <Accent>yours?</Accent></h2>
        <p className="muted" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px", fontSize: 18 }}>
          Lean Six Sigma starts with the constraint: improve anything else and nothing really changes.
          Pick yours, and the interviews and audit aim straight at it.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
          {CONSTRAINTS.map((c, i) => (
            <Link key={c.id} href={`/start?constraint=${c.id}`} className="card" style={{ textDecoration: "none", color: BRAND.deep, borderRadius: "120px 120px 22px 22px", padding: "54px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", alignSelf: "center", display: "grid", placeItems: "center", fontWeight: 800, background: TINTS[i][0], color: TINTS[i][1] }}>{i + 1}</div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: "center" }}>{c.title}</h3>
              <p className="accent" style={{ margin: 0, fontSize: 19, color: BRAND.violet, textAlign: "center", lineHeight: 1.3 }}>“{c.symptom}”</p>
              <p style={{ margin: 0, fontSize: 14, color: BRAND.ink2 }}><b style={{ color: BRAND.deep }}>We look at:</b> {c.lookAt}</p>
              <p style={{ margin: 0, fontSize: 14, color: BRAND.ink2 }}><b style={{ color: BRAND.deep }}>You'll know:</b> {c.know}</p>
              <span style={{ marginTop: "auto", fontWeight: 700, color: BRAND.coral, fontSize: 15 }}>Start here →</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="section" style={{ paddingTop: 64 }}>
        <div className="beam-rule" style={{ marginBottom: 28 }} />
        <div className="card cols3" style={{ padding: 40, borderRadius: 28 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 48, height: 60, background: s.bg, color: s.fg, fontWeight: 800, fontSize: 20, display: "grid", placeItems: "center", borderRadius: "24px 24px 8px 8px" }}>{s.n}</div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{s.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="missing" className="section" style={{ paddingTop: 72 }}>
        <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 800, margin: "0 0 8px", textAlign: "center" }}>Broken, or <Accent>missing?</Accent></h2>
        <p className="muted" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 32px", fontSize: 18 }}>
          Sometimes the process works fine and the constraint comes from something the school has never started doing.
          The diagnosis looks for both: what to fix, and what to begin.
        </p>
        <div className="tex-chalk" style={{ borderRadius: 28, padding: 20, boxShadow: "inset 0 0 0 8px #6B4226, inset 0 0 60px rgba(0,0,0,.45)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, padding: 12 }}>
            {MISSING.map(m => (
              <div key={m.c} style={{ background: "rgba(255,248,243,.96)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{m.c}</h3>
                <p style={{ margin: 0, fontSize: 14, color: BRAND.ink2 }}><b style={{ color: BRAND.coral }}>Fix what's broken:</b> {m.broken}</p>
                <p style={{ margin: 0, fontSize: 14, color: BRAND.ink2 }}><b style={{ color: BRAND.violet }}>Start what's missing:</b> {m.missing}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="deliver" className="section" style={{ paddingTop: 72, paddingBottom: 40 }}>
        <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 800, margin: "0 0 28px", textAlign: "center" }}>From diagnosis to <Accent>remedy.</Accent></h2>
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

      <section id="who" className="section" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingBottom: 48 }}>
        {SERVE.map(s => <span key={s} style={{ border: "1px solid #E5D3C6", borderRadius: 999, padding: "10px 18px", fontWeight: 600, fontSize: 15 }}>{s}</span>)}
      </section>

      <section className="section">
        <div style={{ background: BRAND.coral, color: "#fff", borderRadius: 28, padding: 44, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, maxWidth: 760 }}>
            Know your constraint, and the first fix, <Accent color="#fff">this month.</Accent>
          </h2>
          <Link className="btn lg" href="/start" style={{ background: BRAND.warm, color: BRAND.deep }}>Start free</Link>
        </div>
      </section>

      <footer className="section" style={{ padding: "40px 24px 48px" }}>
        <div className="tex-wood" style={{ borderRadius: 24, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(255,248,243,.95)", borderRadius: 14, padding: "10px 16px", fontSize: 14, color: BRAND.ink2 }}>© shule · Process interviews, docs and improvement for education and ministry</span>
          <span className="accent" style={{ background: "rgba(255,248,243,.95)", borderRadius: 14, padding: "8px 16px", fontSize: 20, color: BRAND.violet }}>“{VERSE.text}” {VERSE.ref}</span>
        </div>
      </footer>
    </main>
  );
}
