export default function Home() {
  return (
    <main className="wrap" style={{ maxWidth: 820, paddingTop: 80 }}>
      <h1 style={{ fontSize: 42, lineHeight: 1.1 }}>Your processes, documented and improved, from one conversation.</h1>
      <p className="muted" style={{ fontSize: 18 }}>
        Book a 45-minute call. Our AI interviewer joins on Zoom and learns how the work really happens.
        You get interactive operations docs, a Lean Six Sigma audit with prioritized improvements, and a
        short video showing how to build each fix.
      </p>
      <ol style={{ fontSize: 16 }}>
        <li>Tell us which processes to look at and who knows them.</li>
        <li>They book a time, and the interviewer handles the call.</li>
        <li>Within an hour you get the docs, the findings (waste, root causes, FMEA, a DMAIC roadmap) and the video guides.</li>
      </ol>
      <a className="btn" href="/start" style={{ display: "inline-block", marginTop: 16, textDecoration: "none" }}>Start an engagement</a>
    </main>
  );
}
