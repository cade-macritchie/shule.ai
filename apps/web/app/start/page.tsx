"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Accent, Logo, StainedGlass } from "@/components/brand";
import { VIDEO_PRICE } from "@/lib/pricing";
import { CONSTRAINTS, type ConstraintId } from "@/lib/constraints";

type Person = { name: string; email: string; role: string };

export default function Start() {
  const [people, setPeople] = useState<Person[]>([{ name: "", email: "", role: "" }]);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState<ConstraintId[]>([]);
  useEffect(() => {   // landing-page cards link here with ?constraint=<id>
    const c = new URLSearchParams(window.location.search).get("constraint");
    if (c && CONSTRAINTS.some(x => x.id === c)) setPicked([c as ConstraintId]);
  }, []);
  const toggle = (id: ConstraintId) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const f = new FormData(e.currentTarget);
    const intake = {
      company: f.get("company"), contact_name: f.get("contact_name"), contact_email: f.get("contact_email"),
      constraints: picked, processes: f.get("processes"), goals: f.get("goals") || undefined, video_policy: f.get("video_policy"),
      interviewees: people.filter(p => p.name && p.email),
    };
    const body = new FormData();
    body.set("intake", JSON.stringify(intake));
    for (const file of f.getAll("files")) body.append("files", file);
    if (process.env.NEXT_PUBLIC_DEMO === "1") { setState("error"); setErr("This is a design preview on GitHub Pages, so the form isn't connected. Nothing was sent."); return; }
    const r = await fetch("/api/intake", { method: "POST", body });
    if (r.ok) setState("done"); else { setState("error"); setErr(await r.text()); }
  }

  if (state === "done") return (
    <main className="wrap" style={{ maxWidth: 680 }}>
      <div style={{ padding: "8px 0 24px" }}><Logo /></div>
      <div className="card arch" style={{ paddingTop: 72, textAlign: "center" }}><h2 style={{ fontSize: 34 }}>You're <Accent>all set.</Accent></h2>
        <p className="muted">Each person you listed will get an email with a booking link shortly. You'll also get a link to your portal, where the docs and findings appear after the interviews.</p></div>
    </main>
  );

  const set = (i: number, k: keyof Person, v: string) => setPeople(ps => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <div style={{ padding: "8px 0 24px" }}><Logo /></div>
      <h1 style={{ fontSize: 44, margin: "0 0 8px" }}>Start an <Accent>engagement.</Accent></h1>
      <p className="muted" style={{ marginTop: 0 }}>Tell us what's holding the school back and who knows that work best. We'll take it from there.</p>
      <div style={{ borderRadius: "24px 24px 0 0", overflow: "hidden", marginTop: 24 }}><StainedGlass height={56} crop={720} /></div>
      <form className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 28 }} onSubmit={submit}>
        <label>Company</label><input name="company" required />
        <label>Your name</label><input name="contact_name" required />
        <label>Your email</label><input name="contact_email" type="email" required />
        <label>What's holding the school back? <span className="muted" style={{ fontWeight: 400 }}>(pick any)</span></label>
        <div style={{ display: "grid", gap: 8 }}>
          {CONSTRAINTS.map(c => {
            const on = picked.includes(c.id);
            return (
              <label key={c.id} style={{ margin: 0, display: "flex", gap: 12, alignItems: "flex-start", fontWeight: 400, cursor: "pointer", padding: "12px 14px", borderRadius: 16,
                background: on ? "var(--violet-soft)" : "#fff", border: `1px solid ${on ? "var(--violet)" : "var(--line)"}` }}>
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} style={{ width: "auto", marginTop: 4 }} />
                <span><b>{c.title}</b><br /><span className="muted" style={{ fontSize: 14 }}>{c.symptom}</span></span>
              </label>
            );
          })}
        </div>
        <label>Which processes should we look at, and why?</label>
        <textarea name="processes" rows={5} required placeholder={picked.includes("cac")
          ? "e.g. Recruiting and marketing: inquiry → visit → application → enrolled. We spend on ads and events but can't say what each new student costs."
          : "e.g. Admissions: application → decision → deposit → enrollment. Decisions take ~3 weeks and we lose admits to slow follow-up."} />
        {(picked.includes("cac") || picked.includes("margin")) && (
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>Tip: invite someone who knows the budget (marketing spend, tuition, aid) as well as someone who does the day-to-day work. We'll ask for last year's numbers so we can calculate {picked.includes("cac") ? "cost per enrolled student" : "margin per student"} for you.</p>
        )}
        <label>What does success look like? (optional)</label><textarea name="goals" rows={3} />
        <label>Who should we interview?</label>
        {people.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input placeholder="Name" value={p.name} onChange={e => set(i, "name", e.target.value)} />
            <input placeholder="Email" type="email" value={p.email} onChange={e => set(i, "email", e.target.value)} />
            <input placeholder="Role" value={p.role} onChange={e => set(i, "role", e.target.value)} />
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setPeople(ps => [...ps, { name: "", email: "", role: "" }])}>+ Add person</button>
        <label>Existing docs, screenshots, exports (optional)</label><input name="files" type="file" multiple />
        <label>Video guides</label>
        <select name="video_policy" defaultValue="major">
          <option value="major">Free preview videos for major problems (recommended)</option>
          <option value="all">Free preview videos for every finding</option>
          <option value="none">No previews, I'll ask from my portal</option>
        </select>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>Previews are free. Unlock any full guide for {VIDEO_PRICE}. <Link href="/diagnosis/pricing">See what's included</Link>.</p>
        <p className="muted" style={{ fontSize: 13 }}>Interviews are recorded and handled by an AI interviewer. Personal data on screen is blurred automatically, and raw recordings are deleted after 30 days.</p>
        <button className="btn lg" style={{ marginTop: 8 }} disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send invitations"}</button>
        {state === "error" && <p style={{ color: "var(--red)" }}>{err}</p>}
      </form>
    </main>
  );
}
