import Image from "next/image";
import Link from "next/link";
import { Accent, BRAND } from "@/components/brand";
import { ConstraintRow, CtaBand, H2, SERVICE, SiteFooter, SiteNav } from "@/components/site";
import bellImg from "../textures/school-bell.webp";

export const metadata = {
  title: "Constraint Diagnosis · shule",
  description: "Find the constraint holding your school back, diagnose what's causing it, and get a remedy for each cause. Free to start.",
};

const STEPS = [
  { n: 1, title: "Name your constraint", body: "Tell us what's holding the school back and who knows that work best. We handle invitations, booking and reminders.", bg: BRAND.blush, fg: "#A8341F" },
  { n: 2, title: "Your people just talk", body: "A patient AI interviewer asks how the work really runs, where it waits and what goes wrong. Screen sharing welcome.", bg: "#EDE6F6", fg: "#4A2F7A" },
  { n: 3, title: "Fix the right thing first", body: "A diagnosis of what is really holding the constraint in place, with the evidence, then a remedy for each cause, ranked by how much it frees the constraint.", bg: "#FFF0CC", fg: "#7A5200" },
];

export default function Diagnosis() {
  return (
    <main>
      <SiteNav />

      <header className="section hero" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="eyebrow" style={{ alignSelf: "flex-start" }}>{SERVICE.name} · a shule service</span>
          <h1 className="h-hero">Find the constraint holding your <Accent>mission</Accent> back.</h1>
          <p className="muted" style={{ margin: 0, fontSize: 20, maxWidth: 600 }}>
            One conversation with the people who do the work shows where the school is stuck, what's causing it,
            and what to fix or start first. Free to start.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link className="btn lg" href={SERVICE.start()}>Find my constraint</Link>
            <Link className="btn ghost lg" href={SERVICE.how}>How it works</Link>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div aria-hidden className="hero-board tex-chalk" />
          <Image src={bellImg} alt="A brass school hand bell, mid-ring" priority sizes="(max-width: 900px) 70vw, 420px"
            style={{ position: "relative", width: "min(100%, 420px)", height: "auto", filter: "drop-shadow(0 30px 36px rgba(10,14,30,.35))" }} />
          <div className="card" style={{ position: "absolute", left: 0, bottom: 4, maxWidth: 260, padding: 16, borderRadius: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.violet }}>Constraint found</div>
            <div style={{ fontWeight: 800, margin: "4px 0" }}>Deposit → registration handoff</div>
            <div className="muted" style={{ fontSize: 14 }}>Admitted students wait 6–9 days for an ID. Fix first: a nightly automated handoff.</div>
          </div>
        </div>
      </header>

      <section className="section" style={{ paddingTop: 24 }}>
        <H2>Which constraint is <Accent>yours?</Accent></H2>
        <p className="muted" style={{ textAlign: "center", margin: "0 auto 24px", maxWidth: 600, fontSize: 18 }}>Pick the one that sounds most like your school to see what we look at.</p>
        <ConstraintRow />
      </section>

      <section className="section" style={{ paddingTop: 64 }}>
        <div className="beam-rule" style={{ marginBottom: 28 }} />
        <div className="card cols3" style={{ padding: 36, borderRadius: 28 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 48, height: 60, background: s.bg, color: s.fg, fontWeight: 800, fontSize: 20, display: "grid", placeItems: "center", borderRadius: "24px 24px 8px 8px" }}>{s.n}</div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{s.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 20, fontWeight: 700 }}>
          <Link href={SERVICE.how}>See the full process and what you get →</Link>
        </p>
      </section>

      <CtaBand>Know your constraint, and the first fix, <Accent color="#fff">this month.</Accent></CtaBand>
      <SiteFooter />
    </main>
  );
}
