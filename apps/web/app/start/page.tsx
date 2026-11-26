"use client";
import { useState } from "react";
import { Accent, Logo, StainedGlass } from "@/components/brand";

type Person = { name: string; email: string; role: string };

export default function Start() {
  const [people, setPeople] = useState<Person[]>([{ name: "", email: "", role: "" }]);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const f = new FormData(e.currentTarget);
    const intake = {
      company: f.get("company"), contact_name: f.get("contact_name"), contact_email: f.get("contact_email"),
      processes: f.get("processes"), goals: f.get("goals") || undefined, video_policy: f.get("video_policy"),
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
      <p className="muted" style={{ marginTop: 0 }}>Tell us which work to look at and who carries it. We'll take it from there.</p>
      <div style={{ borderRadius: "24px 24px 0 0", overflow: "hidden", marginTop: 24 }}><StainedGlass height={56} crop={720} /></div>
      <form className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 28 }} onSubmit={submit}>
        <label>Company</label><input name="company" required />
        <label>Your name</label><input name="contact_name" required />
        <label>Your email</label><input name="contact_email" type="email" required />
        <label>Which processes should we look at, and why?</label>
        <textarea name="processes" rows={5} required placeholder="e.g. Admissions: application → decision → deposit → enrollment. Decisions take ~3 weeks and we lose admits to slow follow-up." />
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
          <option value="major">Generate for major problems</option>
          <option value="all">Generate for every finding</option>
          <option value="none">Only when I ask</option>
        </select>
        <p className="muted" style={{ fontSize: 13 }}>Interviews are recorded and handled by an AI interviewer. Personal data on screen is blurred automatically, and raw recordings are deleted after 30 days.</p>
        <button className="btn lg" style={{ marginTop: 8 }} disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send invitations"}</button>
        {state === "error" && <p style={{ color: "var(--red)" }}>{err}</p>}
      </form>
    </main>
  );
}
