import Image from "next/image";
import Link from "next/link";
import { Accent, BRAND } from "@/components/brand";
import { CtaBand, H2, SERVICE, SERVE, SiteFooter, SiteNav } from "@/components/site";
import { CONSTRAINTS } from "@/lib/constraints";
import bellImg from "./textures/school-bell.webp";

// The company page: who shule is, and its services. Each service has its own pages under its base path.
const WHY = [
  { t: "Built for Christian education", b: "Schools, colleges, seminaries and ministry offices: mission-driven teams with small staffs and full plates." },
  { t: "Your people's knowledge, written down", b: "The way the work really runs lives in a few heads. We capture it in conversation and turn it into docs you keep." },
  { t: "Free to start", b: "Interviews, docs and the diagnosis cost nothing. You pay only for the remedies you choose to unlock." },
];

export default function Company() {
  return (
    <main>
      <SiteNav area="company" />

      <header className="section hero" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="eyebrow" style={{ alignSelf: "flex-start" }}>For Christian schools, colleges and seminaries</span>
          <h1 className="h-hero">Help your school run in <Accent>good order.</Accent></h1>
          <p className="muted" style={{ margin: 0, fontSize: 20, maxWidth: 600 }}>
            shule helps Christian schools find what's holding their mission back and fix it, using AI-led interviews
            with the people who do the work and proven process improvement.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link className="btn lg" href="#services">Our services</Link>
            <Link className="btn ghost lg" href={SERVICE.start()}>Start free</Link>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div aria-hidden className="hero-board tex-chalk" />
          <Image src={bellImg} alt="A brass school hand bell, mid-ring" priority sizes="(max-width: 900px) 70vw, 420px"
            style={{ position: "relative", width: "min(100%, 420px)", height: "auto", filter: "drop-shadow(0 30px 36px rgba(10,14,30,.35))" }} />
        </div>
      </header>

      <div className="section"><div className="beam-rule" /></div>

      <section id="services" className="section" style={{ paddingTop: 64 }}>
        <H2>Our <Accent>services.</Accent></H2>
        <p className="muted" style={{ textAlign: "center", margin: "0 auto 28px", maxWidth: 600, fontSize: 18 }}>Each service is its own engagement, with its own pages and pricing.</p>
        <article className="card" style={{ padding: 0, borderRadius: 28, overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ padding: 36, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: BRAND.violet }}>Service · available now</span>
            <h3 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-.02em" }}>{SERVICE.name}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 17 }}>
              Find the one constraint holding the school back, see what's causing it, and get a remedy for each cause:
              docs, a Lean Six Sigma diagnosis, short videos and a step-by-step build guide with an AI prompt.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
              <Link className="btn" href={SERVICE.base}>Explore {SERVICE.name}</Link>
              <Link className="btn ghost" href={SERVICE.pricing}>Pricing</Link>
            </div>
          </div>
          <div className="tex-chalk" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            <span style={{ color: "#F4F1EA", fontWeight: 700, fontSize: 14, opacity: .85 }}>It starts with one of these:</span>
            {CONSTRAINTS.map(c => (
              <Link key={c.id} href={SERVICE.constraint(c.id)} style={{ background: "rgba(255,248,243,.95)", borderRadius: 12, padding: "10px 14px", fontWeight: 700, textDecoration: "none", color: BRAND.deep }}>
                {c.title} →
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="section cols3" style={{ paddingTop: 64 }}>
        {WHY.map(w => (
          <div key={w.t} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>{w.t}</h3>
            <p className="muted" style={{ margin: 0 }}>{w.b}</p>
          </div>
        ))}
      </section>

      <section className="section" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingTop: 48 }}>
        {SERVE.map(s => <span key={s} style={{ border: "1px solid #E5D3C6", borderRadius: 999, padding: "10px 18px", fontWeight: 600, fontSize: 15 }}>{s}</span>)}
      </section>

      <CtaBand>Know your constraint, and the first fix, <Accent color="#fff">this month.</Accent></CtaBand>
      <SiteFooter />
    </main>
  );
}
