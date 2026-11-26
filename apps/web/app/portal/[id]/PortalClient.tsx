"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ProcessMap, type PageRow } from "@/components/ProcessMap";
import { FindingsMatrix, WasteHeat, type FindingRow } from "@/components/FindingsMatrix";

type Tab = "map" | "findings" | "questions" | "videos";
const body = (md: string) => md.replace(/^---[\s\S]*?\n---\n/, "");

export default function PortalClient({ engagementId, supabaseUrl, anonKey }: { engagementId: string; supabaseUrl: string; anonKey: string }) {
  const sb = useMemo(() => createClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("map");
  const [eng, setEng] = useState<any>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [withVideo, setWithVideo] = useState(true);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  async function load() {
    const [e, p, a, q, v] = await Promise.all([
      sb.from("engagements").select("*").eq("id", engagementId).single(),
      sb.from("pages").select("path, markdown, meta, status").eq("engagement_id", engagementId).order("path"),
      sb.from("audits").select("*").eq("engagement_id", engagementId).eq("status", "done").order("created_at", { ascending: false }).limit(1),
      sb.from("questions").select("*").eq("engagement_id", engagementId).order("created_at"),
      sb.from("videos").select("*").eq("engagement_id", engagementId).order("created_at", { ascending: false }),
    ]);
    setEng(e.data); setPages(p.data ?? []); setQuestions(q.data ?? []); setVideos(v.data ?? []);
    const latest = a.data?.[0]; setAudit(latest ?? null);
    if (latest) {
      const f = await sb.from("findings").select("*").eq("audit_id", latest.id).order("rank");
      setFindings(f.data ?? []);
    }
  }
  useEffect(() => { if (session) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session]);

  async function act(payload: object, label: string) {
    setBusy(label);
    const r = await fetch(`/api/portal/${engagementId}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session!.access_token}` }, body: JSON.stringify(payload),
    });
    setBusy(r.ok ? `${label}: queued ✓` : `${label}: failed`);
    load();
  }

  if (!session) return (
    <main className="wrap" style={{ maxWidth: 480, paddingTop: 80 }}>
      <div className="card"><h2>Sign in to your portal</h2>
        <input placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        <button className="btn" style={{ marginTop: 12 }} onClick={async () => {
          await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } }); setBusy("Check your email for a sign-in link.");
        }}>Email me a link</button>
        <p className="muted">{busy}</p></div>
    </main>
  );

  const rows: FindingRow[] = findings.map(f => ({ id: f.id, rank: f.rank, title: f.title, impact: f.impact, effort: f.effort, rpn: f.rpn, major: f.major, quadrant: f.quadrant, waste: f.waste, confidence: f.confidence }));
  const byPage = findings.reduce<Record<string, number>>((m, f) => (f.page_path ? { ...m, [f.page_path]: (m[f.page_path] ?? 0) + 1 } : m), {});
  const page = pages.find(p => p.path === open);
  const finding = findings.find(f => f.id === picked);
  const pce = audit?.result?.metrics?.pce;
  const sigma = audit?.result?.metrics?.sigma;

  return (
    <main className="wrap">
      <h1 style={{ marginBottom: 0 }}>{eng?.title ?? "…"}</h1>
      <div className="muted">Status: {eng?.status} · {pages.length} pages · {findings.length} findings · {questions.filter(q => q.status === "open").length} open questions</div>
      <div className="tabs">
        {(["map", "findings", "questions", "videos"] as Tab[]).map(t => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      {busy && <p className="muted">{busy}</p>}

      {tab === "map" && (
        <div className="grid2" style={{ gridTemplateColumns: page ? "1fr 1.2fr" : "1fr" }}>
          <ProcessMap pages={pages} findingsByPage={byPage} onOpen={setOpen} />
          {page && (
            <article className="card md">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><span className="pill">{page.meta.type ?? "procedure"}</span><span className="pill">{page.status}</span> owner: {page.meta.owner ?? "—"} · systems: {(page.meta.systems ?? []).join(", ") || "—"}</span>
                <span>{page.status === "draft" && <button className="btn ghost" onClick={() => act({ op: "approve", path: page.path }, "Approve")}>Approve</button>}{" "}
                  <button className="btn ghost" onClick={() => setOpen(null)}>✕</button></span>
              </div>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(body(page.markdown).replace(/^:::sensitive-hidden \d+$/gm, "> 🔒 Restricted section")) as string) }} />
              {findings.filter(f => f.page_path === page.path).map(f => (
                <div key={f.id} className="card" style={{ borderColor: "#fecaca", marginTop: 10 }}>
                  <b>⚠ #{f.rank} {f.title}</b> <span className="pill red">RPN {f.rpn}</span>
                  <div>{f.summary}</div>
                  <a href="#" onClick={e => { e.preventDefault(); setTab("findings"); setPicked(f.id); }}>See the improvement →</a>
                </div>
              ))}
            </article>
          )}
        </div>
      )}

      {tab === "findings" && (
        <div className="grid2" style={{ gridTemplateColumns: "1fr 1.1fr" }}>
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginTop: 0 }}>Where to act</h3>
              <FindingsMatrix rows={rows} onPick={setPicked} />
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <div><div className="muted">Process cycle efficiency</div><b style={{ fontSize: 22 }}>{pce ? `${Math.round(pce.pce * 100)}%` : "needs data"}</b></div>
                <div><div className="muted">Sigma level</div><b style={{ fontSize: 22 }}>{sigma ? `${sigma.sigma}σ (${sigma.dpmo.toLocaleString()} DPMO)` : "needs defect data"}</b></div>
              </div>
            </div>
            <div className="card" style={{ marginBottom: 14 }}><h3 style={{ marginTop: 0 }}>Waste (TIMWOODS)</h3><WasteHeat rows={rows} /></div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Run again</h3>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={withVideo} onChange={e => setWithVideo(e.target.checked)} /> Generate a video guide
              </label>
              <button className="btn" onClick={() => act({ op: "audit", generate_video: withVideo }, "Audit")}>Run full audit</button>
            </div>
          </div>
          <div>
            {!finding && <table className="t card"><thead><tr><th>#</th><th>Finding</th><th>RPN</th><th>Quadrant</th></tr></thead><tbody>
              {findings.map(f => <tr key={f.id} onClick={() => setPicked(f.id)} style={{ cursor: "pointer" }}>
                <td>{f.rank}</td><td>{f.major && <span className="pill red">major</span>}{f.title}</td><td>{f.rpn}</td><td>{f.quadrant}</td></tr>)}
            </tbody></table>}
            {finding && <FindingDetail f={finding} onBack={() => setPicked(null)}
              onOptimize={() => act({ op: "optimize", finding_id: finding.id, generate_video: withVideo }, "Optimization")}
              onVideo={() => act({ op: "video", finding_ids: [finding.id] }, "Video")} />}
          </div>
        </div>
      )}

      {tab === "questions" && <Questions qs={questions} onSave={a => act({ op: "answer", answers: a }, "Answers")} onApply={() => act({ op: "apply_answers" }, "Write answers into pages")} />}

      {tab === "videos" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px,1fr))", gap: 14 }}>
          {videos.map(v => <div key={v.id} className="card">
            <b>{v.title ?? "Video guide"}</b> <span className="pill">{v.status}</span>
            {v.status === "ready" && <VideoPlayer sb={sb} v={v} />}
          </div>)}
          {!videos.length && <p className="muted">No videos yet. Open a finding and choose "Make a video guide".</p>}
        </div>
      )}
    </main>
  );
}

function FindingDetail({ f, onBack, onOptimize, onVideo }: { f: any; onBack: () => void; onOptimize: () => void; onVideo: () => void }) {
  const phases = ["Define", "Measure", "Analyze", "Improve", "Control"];
  return (
    <div className="card">
      <button className="btn ghost" onClick={onBack}>← All findings</button>
      <h2>#{f.rank} {f.title}</h2>
      <div>{f.major && <span className="pill red">major</span>}<span className="pill">{f.quadrant}</span><span className="pill">{f.value}</span>
        <span className="pill amber">RPN {f.rpn} = S{f.severity}×O{f.occurrence}×D{f.detection}</span><span className="pill">confidence: {f.confidence}</span></div>
      <p>{f.summary}</p>
      <p><b>Waste:</b> {f.waste.join(", ")}</p>
      <h3>Root causes (6M)</h3>
      <ul>{f.root_causes.map((c: any, i: number) => <li key={i}><b>{c.m}:</b> {c.cause} {c.root && <span className="pill red">root</span>}</li>)}</ul>
      {f.five_whys?.length > 0 && <><h3>5 Whys</h3><ol>{f.five_whys.map((w: string, i: number) => <li key={i}>{w}</li>)}</ol></>}
      <h3>Future state</h3><p>{f.recommendation.future_state}</p>
      <h3>How to implement</h3>
      <ol>{f.recommendation.implementation.map((s: any, i: number) => <li key={i}><b>{s.step}</b>{s.system && <span className="pill">{s.system}</span>}<br />{s.detail}{s.owner && <span className="muted"> · {s.owner}</span>}</li>)}</ol>
      {f.recommendation.poka_yoke && <p><b>Poka-yoke:</b> {f.recommendation.poka_yoke}</p>}
      <h3>DMAIC</h3>
      <table className="t"><tbody>{phases.filter(p => f.dmaic.actions?.[p]).map(p => <tr key={p}><td><b>{p}</b>{p === f.dmaic.start_phase && " ◀ start"}</td><td>{f.dmaic.actions[p]}</td></tr>)}</tbody></table>
      {f.control_plan?.length > 0 && <><h3>Control plan</h3><table className="t"><thead><tr><th>Metric</th><th>Target</th><th>Method</th><th>Owner</th><th>When</th><th>If off-target</th></tr></thead>
        <tbody>{f.control_plan.map((c: any, i: number) => <tr key={i}><td>{c.metric}</td><td>{c.target}</td><td>{c.method}</td><td>{c.owner}</td><td>{c.frequency}</td><td>{c.reaction}</td></tr>)}</tbody></table></>}
      <h3>Evidence</h3>
      <ul>{f.evidence.map((e: any, i: number) => <li key={i}>{e.t ? <><code>{e.t}</code> “{e.quote}”</> : <>{e.page}{e.step ? ` step ${e.step}` : ""}</>}</li>)}</ul>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={onOptimize}>Run an optimization on this</button>
        <button className="btn ghost" onClick={onVideo}>🎬 Make a video guide</button>
      </div>
    </div>
  );
}

function Questions({ qs, onSave, onApply }: { qs: any[]; onSave: (a: { id: string; answer: string }[]) => void; onApply: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const open = qs.filter(q => q.status === "open");
  return (
    <div className="card">
      {open.map(q => <div key={q.id} style={{ marginBottom: 14 }}>
        <span className={`pill ${q.importance === "high" ? "red" : "amber"}`}>{q.importance}</span> <span className="muted">{q.page_path}</span>
        <div><b>{q.question}</b></div><div className="muted">{q.why}</div>
        <textarea rows={2} value={draft[q.id] ?? ""} onChange={e => setDraft(d => ({ ...d, [q.id]: e.target.value }))} />
      </div>)}
      {!open.length && <p className="muted">No open questions.</p>}
      <button className="btn" onClick={() => onSave(Object.entries(draft).filter(([, v]) => v.trim()).map(([id, answer]) => ({ id, answer })))}>Save answers</button>{" "}
      <button className="btn ghost" onClick={onApply}>Write answers into the pages</button>
    </div>
  );
}

function VideoPlayer({ sb, v }: { sb: any; v: any }) {
  const [src, setSrc] = useState<{ mp4: string; vtt?: string } | null>(null);
  useEffect(() => {
    (async () => {
      const mp4 = await sb.storage.from("videos").createSignedUrl(v.mp4_path, 3600);
      const vtt = v.srt_path ? await sb.storage.from("videos").createSignedUrl(v.srt_path.replace(/\.srt$/, ".vtt"), 3600) : null;
      setSrc({ mp4: mp4.data?.signedUrl, vtt: vtt?.data?.signedUrl });
    })();
  }, [sb, v]);
  if (!src) return null;
  return <video controls style={{ width: "100%", marginTop: 8, borderRadius: 8 }} src={src.mp4}>
    {src.vtt && <track kind="captions" src={src.vtt} default srcLang="en" label="English" />}
  </video>;
}
