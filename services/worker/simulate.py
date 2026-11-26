"""Offline dry run: canned transcript → pages → LSS audit → storyboard (→ optional render).
No Supabase, Zoom or Recall needed, only ANTHROPIC_API_KEY.

  python simulate.py tests/fixtures/sample_transcript.json --out sim_out [--render]
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from ps import media, models
from ps.agents import VIDEO_DIR, split_frontmatter, srt_cues
from ps.claude import ask, ask_validated, prompt, tag, tag_json
import datetime as dt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("transcript")
    ap.add_argument("--out", default="sim_out")
    ap.add_argument("--org", default="Sample Seminary")
    ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    out = Path(a.out); (out / "pages").mkdir(parents=True, exist_ok=True)
    utts = json.loads(Path(a.transcript).read_text())
    lines = media.transcript_lines(utts, [])
    shared = prompt("handbook")

    print("1/4 outline")
    outline = tag_json(ask(shared + "\n\n" + prompt("outline"), f"<pages>(none)</pages>\n<transcript>\n{lines}\n</transcript>", max_tokens=6000), "outline")
    batch = "\n".join(f"- {p['path']}: {p['title']} ({p['type']})" for p in outline["pages"])

    print(f"2/4 drafting {len(outline['pages'])} pages")
    pages = []
    for p in outline["pages"]:
        reply = ask(shared + "\n\n" + prompt("draft", today=dt.date.today().isoformat()),
                    f"<target>new: {json.dumps({k: p[k] for k in ('path', 'title', 'type', 'department')})}</target>\n"
                    f"<pages_this_batch>\n{batch}\n</pages_this_batch>\n<transcript>\n{lines}\n</transcript>", max_tokens=10000)
        doc = tag(reply, "document")
        dest = out / "pages" / p["path"]; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text(doc)
        pages.append({"path": p["path"], "markdown": doc})
        print("   ", p["path"], "| questions:", (tag(reply, "questions") or "").count("["))

    print("3/4 Lean Six Sigma audit")
    schema = json.dumps(models.AuditResult.model_json_schema(), separators=(",", ":"))
    audit, raw = ask_validated(prompt("lss_audit", org=a.org, kind="audit", optimization_extra="", schema=schema),
                               "<pages>\n" + "\n\n".join(f"<page path='{p['path']}'>\n{p['markdown']}\n</page>" for p in pages)
                               + f"\n</pages>\n<transcripts>\n{lines}\n</transcripts>", "audit", models.AuditResult, max_tokens=24000)
    ranked = models.rank(audit.findings)
    (out / "audit.json").write_text(audit.model_dump_json(indent=2))
    print("    metrics:", models.metrics(audit))
    for i, f in enumerate(ranked, 1):
        print(f"    #{i} {'MAJOR ' if f.major else ''}{f.title} | RPN {f.rpn} | {f.quadrant} | {', '.join(f.waste)}")

    print("4/4 storyboard for the top finding")
    top = ranked[0]
    sb_reply = ask(prompt("storyboard", schema=(VIDEO_DIR.parent / "shared/src/storyboard.ts").read_text()),
                   f"<engagement>{a.org} process review</engagement>\n<findings>{json.dumps([top.model_dump() | {'rpn': top.rpn}])}</findings>\n"
                   f"<sipoc_value_stream>{audit.model_dump_json(include={'sipoc', 'value_stream'})}</sipoc_value_stream>\n"
                   "<pages>\n" + "\n\n".join(p["markdown"] for p in pages) + "\n</pages>", max_tokens=12000)
    sb = tag_json(sb_reply, "storyboard")
    (out / "storyboard.json").write_text(json.dumps(sb, indent=2))
    r = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "validate.mjs", str((out / "storyboard.json").resolve())],
                       cwd=VIDEO_DIR, capture_output=True, text=True)
    print("    storyboard:", r.stdout.strip())
    if a.render and r.returncode == 0:
        subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "render.mjs", str((out / "storyboard.json").resolve()),
                        str((out / "guide.mp4").resolve())], cwd=VIDEO_DIR, check=True)
    print(f"done → {out}/")


if __name__ == "__main__":
    main()
