import Link from "next/link";
import type { ReactNode } from "react";
import { Accent, BRAND, Logo, VERSE } from "@/components/brand";
import { CONSTRAINTS } from "@/lib/constraints";

/** Site map: shule (company) → services. Constraint Diagnosis is the first service. */
export const SERVICE = {
  name: "Constraint Diagnosis",
  base: "/diagnosis",
  constraint: (id: string) => `/diagnosis/constraints/${id}`,
  how: "/diagnosis/how-it-works",
  pricing: "/diagnosis/pricing",
  start: (id?: string) => (id ? `/start?constraint=${id}` : "/start"),
};

export const SERVE = ["Christian K–12 and classical schools", "Christian colleges and universities", "Seminaries", "Churches and ministry offices"];
export const TINTS = [[BRAND.blush, "#A8341F"], ["#EDE6F6", "#4A2F7A"], ["#FFF0CC", "#7A5200"], [BRAND.blush, "#A8341F"], ["#EDE6F6", "#4A2F7A"]];

function ConstraintMenu() {
  return (
    <details className="menu">
      <summary>Constraints</summary>
      <div className="menu-panel">
        {CONSTRAINTS.map(c => <Link key={c.id} href={SERVICE.constraint(c.id)}>{c.title}</Link>)}
      </div>
    </details>
  );
}

/** Top navigation. On the company page it points at services; inside a service it shows that service's pages. */
export function SiteNav({ area = "service" }: { area?: "company" | "service" }) {
  const links = area === "company"
    ? [["Services", "/#services"], ["Constraint Diagnosis", SERVICE.base]]
    : [["How it works", SERVICE.how], ["Pricing", SERVICE.pricing]];
  return (
    <nav className="section nav" style={{ paddingTop: 24, paddingBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Logo />
        {area === "service" && (
          <Link href={SERVICE.base} className="service-tag">{SERVICE.name}</Link>
        )}
      </div>
      <div className="nav-links">
        {area === "service" && <ConstraintMenu />}
        {links.map(([t, h]) => <Link key={h} href={h}>{t}</Link>)}
        <Link className="btn" href={SERVICE.start()}>Start free</Link>
      </div>
      <details className="menu mobile-menu">
        <summary>Menu</summary>
        <div className="menu-panel right">
          <Link href="/">shule home</Link>
          <Link href={SERVICE.base}>{SERVICE.name}</Link>
          {CONSTRAINTS.map(c => <Link key={c.id} href={SERVICE.constraint(c.id)} className="sub">{c.title}</Link>)}
          <Link href={SERVICE.how}>How it works</Link>
          <Link href={SERVICE.pricing}>Pricing</Link>
          <Link href={SERVICE.start()}>Start free</Link>
        </div>
      </details>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="section" style={{ padding: "48px 24px 48px" }}>
      <div className="tex-wood" style={{ borderRadius: 24, padding: 22 }}>
        <div style={{ background: "rgba(255,248,243,.97)", borderRadius: 16, padding: "22px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, fontSize: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Logo size={26} />
            <span className="muted">Process interviews, docs and improvement for Christian education and ministry.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <b style={{ color: BRAND.deep }}>{SERVICE.name}</b>
            <Link href={SERVICE.how}>How it works</Link>
            <Link href={SERVICE.pricing}>Pricing</Link>
            <Link href={SERVICE.start()}>Start free</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <b style={{ color: BRAND.deep }}>Constraints</b>
            {CONSTRAINTS.map(c => <Link key={c.id} href={SERVICE.constraint(c.id)}>{c.title}</Link>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <b style={{ color: BRAND.deep }}>Who we serve</b>
            {SERVE.map(s => <span key={s} className="muted">{s}</span>)}
          </div>
        </div>
        <p className="accent" style={{ margin: "14px 0 0", textAlign: "center", fontSize: 20, color: "#FFF8F3", textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>“{VERSE.text}” {VERSE.ref}</p>
      </div>
    </footer>
  );
}

/** Coral call-to-action band used at the bottom of every page. */
export function CtaBand({ href = SERVICE.start(), label = "Start free", children }: { href?: string; label?: string; children?: ReactNode }) {
  return (
    <section className="section" style={{ paddingTop: 64 }}>
      <div style={{ background: BRAND.coral, color: "#fff", borderRadius: 28, padding: 40, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 780 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(26px, 3.4vw, 38px)", fontWeight: 800 }}>
            {children ?? <>Take the next step on removing your <Accent color="#fff">#1 constraint.</Accent></>}
          </h2>
          <p style={{ margin: "10px 0 0", fontSize: 18, color: "#FFE4DC" }}>Not sure what it is? We can help you find it.</p>
        </div>
        <Link className="btn lg" href={href} style={{ background: BRAND.warm, color: BRAND.deep }}>{label}</Link>
      </div>
    </section>
  );
}

/** Compact row of the five constraints, each linking to its page. `current` is dimmed (used on constraint pages). */
export function ConstraintRow({ current }: { current?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {CONSTRAINTS.map((c, i) => (
        <Link key={c.id} href={SERVICE.constraint(c.id)} aria-current={c.id === current ? "page" : undefined}
          style={{ background: TINTS[i][0], color: TINTS[i][1], borderRadius: 999, padding: "12px 18px", fontWeight: 700, fontSize: 15, textDecoration: "none", opacity: c.id === current ? 0.45 : 1 }}>
          {c.title} →
        </Link>
      ))}
    </div>
  );
}

export const H2 = ({ children, center = true }: { children: ReactNode; center?: boolean }) => (
  <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 800, margin: "0 0 10px", textAlign: center ? "center" : "left" }}>{children}</h2>
);
export { Accent };
