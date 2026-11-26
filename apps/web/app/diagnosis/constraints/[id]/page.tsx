import Link from "next/link";
import { notFound } from "next/navigation";
import { Accent, BRAND } from "@/components/brand";
import { ConstraintRow, CtaBand, H2, SERVICE, SiteFooter, SiteNav } from "@/components/site";
import { CONSTRAINTS } from "@/lib/constraints";

// One page per constraint: built at export time, so each has a stable URL for outreach links.
export const dynamicParams = false;
export function generateStaticParams() {
  return CONSTRAINTS.map(c => ({ id: c.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = CONSTRAINTS.find(x => x.id === id);
  return c ? { title: `${c.title} · ${SERVICE.name} · shule`, description: c.symptom } : {};
}

const CAC_NOTE = "CAC = (marketing spend + recruiting staff time) ÷ new students enrolled. We work it out from your numbers, per channel where we can, and set it against what each student brings in.";

export default async function ConstraintPage({ params }: Props) {
  const { id } = await params;
  const c = CONSTRAINTS.find(x => x.id === id);
  if (!c) notFound();
  return (
    <main>
      <SiteNav />

      <header className="section" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 960 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>
          <Link href={SERVICE.base}>{SERVICE.name}</Link> <span className="muted">/ Constraints</span>
        </nav>
        <h1 className="h-hero" style={{ fontSize: "clamp(40px, 5.5vw, 66px)" }}>{c.title}<Accent>?</Accent></h1>
        <p className="muted" style={{ fontSize: 22, margin: "18px 0 26px", maxWidth: 720 }}>{c.symptom}</p>
        <Link className="btn lg" href={SERVICE.start(c.id)}>Diagnose this constraint, free</Link>
      </header>

      <section className="section" style={{ maxWidth: 1080 }}>
        <div className="tex-chalk" style={{ borderRadius: 28, padding: 20, boxShadow: "inset 0 0 0 8px #6B4226, inset 0 0 60px rgba(0,0,0,.45)" }}>
          <p style={{ color: "#F4F1EA", margin: "8px 12px 14px", fontWeight: 700 }}>Usually it's one of two things, and often both:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, padding: "0 12px 12px" }}>
            <div style={{ background: "rgba(255,248,243,.97)", borderRadius: 18, padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.coral }}>Something's broken</div>
              <p style={{ margin: "8px 0 0", fontSize: 18 }}>{c.broken}</p>
            </div>
            <div style={{ background: "rgba(255,248,243,.97)", borderRadius: 18, padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.violet }}>Something's missing</div>
              <p style={{ margin: "8px 0 0", fontSize: 18 }}>{c.missing}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cols3" style={{ paddingTop: 56, maxWidth: 1080 }}>
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>What we look at</h2>
          <p className="muted" style={{ margin: 0 }}>{c.lookAt}</p>
        </div>
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>What you'll know</h2>
          <p className="muted" style={{ margin: 0 }}>{c.know}</p>
          {c.id === "cac" && <p style={{ margin: "10px 0 0", fontSize: 14, color: BRAND.deep, background: "#FFF0CC", borderRadius: 12, padding: 12 }}>{CAC_NOTE}</p>}
        </div>
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>What you get</h2>
          <p className="muted" style={{ margin: 0 }}>
            Docs of how the work runs, a diagnosis of each cause, and a remedy for each: a short video, a step-by-step
            build guide and an AI prompt. <Link href={SERVICE.how}>See how it works</Link>.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 64 }}>
        <H2>Or is it <Accent>another one?</Accent></H2>
        <div style={{ marginTop: 18 }}><ConstraintRow current={c.id} /></div>
      </section>

      <CtaBand href={SERVICE.start(c.id)} label="Start free" />
      <SiteFooter />
    </main>
  );
}
