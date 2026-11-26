"use client";
// Department → flow → steps → linked procedure; same relationship model as the handbook.
export type PageRow = { path: string; markdown: string; meta: Record<string, any>; status: string };

const linkRe = /^\s*(\d+)\.\s+(?:\[([^\]]+)\]\(([^)]+\.md)\))?(.*)$/;

export function flowSteps(p: PageRow) {
  const m = p.markdown.split(/^## Steps\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  const dir = p.path.split("/").slice(0, -1).join("/");
  return m.split("\n").map(l => l.match(linkRe)).filter(Boolean).map(x => ({
    n: Number(x![1]), label: (x![2] ?? x![4]).replace(/^[:\s-]+/, "").trim(),
    target: x![3] ? [dir, x![3]].filter(Boolean).join("/").replace(/[^/]+\/\.\.\//g, "") : null,
  }));
}

export function ProcessMap({ pages, findingsByPage, onOpen }: {
  pages: PageRow[]; findingsByPage: Record<string, number>; onOpen: (path: string) => void;
}) {
  const depts = [...new Set(pages.map(p => p.meta.department ?? p.path.split("/")[0]))];
  const flows = pages.filter(p => p.meta.type === "flow");
  const linked = new Set(flows.flatMap(f => flowSteps(f).map(s => s.target)).filter(Boolean));
  const orphans = pages.filter(p => p.meta.type !== "flow" && !linked.has(p.path));
  const badge = (path: string) => findingsByPage[path] ? <span className="pill red">{findingsByPage[path]} finding{findingsByPage[path] > 1 ? "s" : ""}</span> : null;

  return (
    <div>
      {depts.map(d => (
        <section key={d} className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>{d}</h3>
          {flows.filter(f => (f.meta.department ?? f.path.split("/")[0]) === d).map(f => (
            <div key={f.path} style={{ marginBottom: 14 }}>
              <a href="#" onClick={e => { e.preventDefault(); onOpen(f.path); }}><b>{f.meta.title}</b></a> {badge(f.path)}
              <span className="pill">{f.status}</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {flowSteps(f).map(s => (
                  <div key={s.n} onClick={() => s.target && onOpen(s.target)}
                    style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", minWidth: 150, cursor: s.target ? "pointer" : "default", background: s.target ? "#fff" : "#f1f5f9" }}>
                    <div className="muted" style={{ fontSize: 12 }}>Step {s.n}</div>
                    <div style={{ fontWeight: 600 }}>{s.label}</div>
                    {s.target ? badge(s.target) : <span className="muted" style={{ fontSize: 12 }}>no procedure yet</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {orphans.filter(o => (o.meta.department ?? o.path.split("/")[0]) === d).map(o => (
            <div key={o.path}><a href="#" onClick={e => { e.preventDefault(); onOpen(o.path); }}>{o.meta.title}</a> <span className="muted">(not linked to a flow)</span> {badge(o.path)}</div>
          ))}
        </section>
      ))}
    </div>
  );
}
