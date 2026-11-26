"""Job handlers. Each takes the job payload; raise to retry."""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import re
import secrets
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import yaml

from . import media, models
from .claude import ask, ask_validated, image_block, prompt, tag, tag_json, ROOT
from .services import (db, download, enqueue, log, recall_bot, recall_media_urls, send_email, tts, upload)

BASE = os.environ.get("PUBLIC_BASE_URL", "http://localhost:3000").rstrip("/")
today = lambda: dt.date.today().isoformat()
now = lambda: dt.datetime.now(dt.timezone.utc)
iso = lambda d: d.isoformat()


def _one(table: str, **eq):
    q = db().table(table).select("*")
    for k, v in eq.items():
        q = q.eq(k, v)
    rows = q.limit(1).execute().data
    return rows[0] if rows else None


# ======================= outreach / scheduling =======================

def outreach(p: dict):
    kind = p["kind"]
    if kind in ("invite", "nudge"):
        eng = _one("engagements", id=p["engagement_id"])
        people = db().table("interviewees").select("*").eq("engagement_id", eng["id"]).eq("status", "invited").execute().data
        company = eng["intake"].get("company", "your team")
        for person in people:
            if kind == "nudge" and person["reminders_sent"] >= 2:
                continue
            link = os.environ["CAL_BOOKING_URL"] + "?" + urlencode({"name": person["name"], "email": person["email"]})
            subject = (f"{company}: 45 minutes to walk through how your work gets done" if kind == "invite"
                       else f"Reminder: pick a time for your {company} process interview")
            send_email(person["email"], subject, f"""
<p>Hi {person['name'].split()[0]},</p>
<p>{company} has asked us to document and improve a few of its processes, and you were named as someone who knows them well.</p>
<p>The interview is a 45-minute Zoom call with our <b>AI interviewer</b>. It will ask how the work happens day to day: the steps,
the systems you use, where things wait, and what goes wrong. The call is recorded so the docs can be written, and any personal
data on screen is blurred automatically.</p>
<p><a href="{link}">Choose a time →</a></p>
<p>Thank you!</p>""")
            db().table("interviewees").update({"last_contacted_at": iso(now()),
                                               "reminders_sent": person["reminders_sent"] + (kind == "nudge")}).eq("id", person["id"]).execute()
        if people:
            enqueue("outreach", {"kind": "nudge", "engagement_id": eng["id"]}, iso(now() + dt.timedelta(days=2 if kind == "invite" else 3)))
    elif kind in ("pre_call", "booking_confirmed"):
        iv = _one("interviews", id=p["interview_id"])
        if not iv or iv["status"] != "scheduled":
            return
        person = _one("interviewees", id=iv["interviewee_id"])
        start = dt.datetime.fromisoformat(iv["start_at"].replace("Z", "+00:00"))
        link = join_link(iv)
        where = "your interview room" if iv["medium"] == "room" else "Zoom"
        if kind == "booking_confirmed":
            subject = "You're booked: your process interview link"
            lead = f"Thanks for booking! Your interview is on {start:%A %B %-d at %H:%M} UTC."
        else:
            subject = f"Your process interview is {'tomorrow' if p['when'] == '24h' else 'in an hour'}"
            lead = f"Just a reminder: your interview starts at {start:%H:%M} UTC."
        send_email(person["email"], subject, f"""
<p>Hi {person['name'].split()[0]}, {lead}</p>
<p><a href="{link}">Join {where} →</a> (it opens 15 minutes early)</p>
<p>Use Chrome or Edge on a computer, and headphones if you have them. Have the systems you use open so you can share your screen.</p>""")


def join_link(iv: dict) -> str:
    return f"{BASE}/room/{iv['id']}?t={iv['agent_token']}" if iv.get("medium", "room") == "room" else iv["zoom_url"]


def no_show(p: dict):
    """20 min after the start: if nobody joined, mark it and send a rebooking link."""
    iv = _one("interviews", id=p["interview_id"])
    if not iv or iv["status"] != "scheduled":
        return
    db().table("interviews").update({"status": "no_show"}).eq("id", iv["id"]).execute()
    person = _one("interviewees", id=iv["interviewee_id"])
    db().table("interviewees").update({"status": "invited"}).eq("id", person["id"]).execute()
    link = os.environ["CAL_BOOKING_URL"] + "?" + urlencode({"name": person["name"], "email": person["email"]})
    send_email(person["email"], "We missed you: pick a new time?", f"<p>No problem! <a href='{link}'>Choose another time →</a></p>")
    log(iv["engagement_id"], "no_show", iv["id"])


def invite_client(p: dict):
    """Create (or find) the client's user, add as client_admin, email a portal magic link."""
    eng = _one("engagements", id=p["engagement_id"])
    res = db().auth.admin.generate_link({"type": "magiclink", "email": p["email"],
                                         "options": {"redirect_to": f"{BASE}/portal/{eng['id']}"}})
    user_id = res.user.id
    db().table("org_members").upsert({"org_id": eng["org_id"], "user_id": user_id, "role": "client_admin"}).execute()
    send_email(p["email"], "Your shule portal", f"""
<p>We've invited your interviewees. Track progress, and later read the docs, findings and video guides, in your portal:</p>
<p><a href="{res.properties.action_link}">Open the portal →</a></p>""")


# ======================= interview =======================

def _intake_files(eng_id: str) -> list[dict]:
    blocks = []
    files = db().storage.from_("media").list(f"{eng_id}/intake") or []
    for f in files[:10]:
        data = db().storage.from_("media").download(f"{eng_id}/intake/{f['name']}")
        name = f["name"].lower()
        if name.endswith((".png", ".jpg", ".jpeg")):
            import base64
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": "image/png" if name.endswith("png") else "image/jpeg",
                                                       "data": base64.b64encode(data).decode()}})
        elif name.endswith(".pdf"):
            import base64
            blocks.append({"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": base64.b64encode(data).decode()}})
        elif name.endswith((".txt", ".md", ".csv")):
            blocks.append({"type": "text", "text": f"<file name='{f['name']}'>\n{data.decode(errors='replace')[:60000]}\n</file>"})
    return blocks


def interview_plan(p: dict):
    iv = _one("interviews", id=p["interview_id"])
    eng = _one("engagements", id=iv["engagement_id"])
    person = _one("interviewees", id=iv["interviewee_id"])
    content = [{"type": "text", "text": f"<intake>{json.dumps(eng['intake'])}</intake>\n<interviewee>{json.dumps({'name': person['name'], 'role': person['role']})}</interviewee>"}]
    content += _intake_files(eng["id"])
    reply = ask(prompt("interview_plan"), content, max_tokens=4000)
    plan = tag_json(reply, "plan")
    coverage = {f"{pr['key']}.{slot}": v for pr in plan["processes"] for slot, v in pr["slots"].items()}
    db().table("interview_state").update({"plan": plan, "coverage": coverage}).eq("interview_id", iv["id"]).execute()


def post_interview(p: dict):
    iv = _one("interviews", id=p["interview_id"])
    db().table("interviews").update({"status": "processing"}).eq("id", iv["id"]).execute()
    db().table("engagements").update({"status": "processing"}).eq("id", iv["engagement_id"]).execute()
    work = Path(tempfile.mkdtemp(prefix="ps-iv-"))
    frames = room_media(iv, work) if iv.get("medium", "room") == "room" else recall_media(iv, work)
    (work / "frames.json").write_text(json.dumps(frames))
    upload("frames", f"{iv['engagement_id']}/{iv['id']}/frames.json", work / "frames.json", "application/json")
    db().table("interviews").update({"status": "processed"}).eq("id", iv["id"]).execute()
    db().table("interviewees").update({"status": "interviewed"}).eq("id", iv["interviewee_id"]).execute()
    enqueue("draft_docs", {"interview_id": iv["id"]})


def concat_chunks(names: list[str], fetch, dest: Path) -> Path | None:
    """MediaRecorder timeslice chunks are one continuous WebM when appended in order; remux to fix the index."""
    names = sorted(n for n in names if n.endswith(".webm"))
    if not names:
        return None
    raw = dest.with_suffix(".raw.webm")
    with raw.open("wb") as f:
        for n in names:
            f.write(fetch(n))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-c", "copy", str(dest)], check=True)
    raw.unlink()
    return dest


def room_media(iv: dict, work: Path) -> list[dict]:
    """Browser room: stitch each recorder's chunks; screenshot screen-share streams at their offsets.
    The transcript already exists (utterances were transcribed live)."""
    base = f"{iv['engagement_id']}/{iv['id']}/room"
    bucket = db().storage.from_("media")
    frames: list[dict] = []
    for st in sorted(iv.get("streams") or [], key=lambda x: x["offset_s"]):
        name, offset = st["stream"], float(st["offset_s"])
        files = [f["name"] for f in (bucket.list(f"{base}/{name}", {"limit": 10000}) or [])]
        out = concat_chunks(files, lambda n: bucket.download(f"{base}/{name}/{n}"), work / f"{name}.webm")
        if not out:
            continue
        upload("media", f"{base}/{name}.webm", out, "video/webm")       # stitched copy; chunks can go
        bucket.remove([f"{base}/{name}/{n}" for n in files])
        if name.startswith("screen-"):
            got = media.screenshots(out, work / "frames", offset=offset, start_index=len(frames))
            for f in got:
                upload("frames", f"{iv['engagement_id']}/{iv['id']}/{f['name']}", work / "frames" / f["name"], "image/jpeg")
            frames += got
        out.unlink(missing_ok=True)
    audio = [s["stream"] for s in iv.get("streams") or [] if s["stream"].startswith("audio-")]
    if audio:
        db().table("interviews").update({"recording_path": f"{base}/{audio[0]}.webm"}).eq("id", iv["id"]).execute()
    return sorted(frames, key=lambda f: f["t"])


def recall_media(iv: dict, work: Path) -> list[dict]:
    bot = recall_bot(iv["bot_id"])
    urls = recall_media_urls(bot)
    # Prefer Recall's post-call (diarized) transcript over the live one.
    if urls["transcript"]:
        download(urls["transcript"], work / "transcript.json")
        bot_name = os.environ.get("BOT_NAME", "shule interviewer")
        rows = []
        for seg in json.loads((work / "transcript.json").read_text()):
            words = seg.get("words") or []
            speaker = (seg.get("participant") or {}).get("name") or "Speaker"
            if not words or speaker == bot_name:
                continue
            rows.append({"interview_id": iv["id"], "speaker": speaker, "is_bot": False, "text": " ".join(w["text"] for w in words),
                         "t_start": (words[0].get("start_timestamp") or {}).get("relative"),
                         "t_end": (words[-1].get("end_timestamp") or {}).get("relative")})
        if rows:  # replace live utterances (keep bot lines, which the live loop logged)
            db().table("interview_utterances").delete().eq("interview_id", iv["id"]).eq("is_bot", False).execute()
            db().table("interview_utterances").insert(rows).execute()
    frames = []
    if urls["video"]:
        src = work / "recording.mp4"
        download(urls["video"], src)
        key = f"{iv['engagement_id']}/{iv['id']}/recording.mp4"
        upload("media", key, src, "video/mp4")
        db().table("interviews").update({"recording_path": key}).eq("id", iv["id"]).execute()
        frames = media.screenshots(src, work / "frames")
        for f in frames:
            upload("frames", f"{iv['engagement_id']}/{iv['id']}/{f['name']}", work / "frames" / f["name"], "image/jpeg")
        src.unlink(missing_ok=True)
    return frames


# ======================= docs =======================

def _frames_for(iv) -> list[dict]:
    try:
        return json.loads(db().storage.from_("frames").download(f"{iv['engagement_id']}/{iv['id']}/frames.json"))
    except Exception:  # noqa: BLE001
        return []


def _utts(iv_id: str) -> list[dict]:
    return db().table("interview_utterances").select("*").eq("interview_id", iv_id).order("t_start").execute().data


def _to_sec(h: str) -> int:
    a = [int(x) for x in h.split(":")]
    return a[0] * 3600 + a[1] * 60 + a[2] if len(a) == 3 else a[0] * 60 + a[1]


def split_frontmatter(md: str) -> tuple[dict, str]:
    m = re.match(r"^---\n([\s\S]*?)\n---\n?", md)
    return (yaml.safe_load(m.group(1)) or {}, md[m.end():]) if m else ({}, md)


def save_page(eng_id: str, path: str, md: str, message: str, author="shule", status=None):
    meta, _ = split_frontmatter(md)
    meta = json.loads(json.dumps(meta, default=str))
    cur = _one("pages", engagement_id=eng_id, path=path)
    row = {"engagement_id": eng_id, "path": path, "markdown": md, "meta": meta,
           "status": status or meta.get("status", "draft"), "updated_at": iso(now())}
    if cur:
        row["version"] = cur["version"] + 1
        db().table("pages").update(row).eq("id", cur["id"]).execute()
        pid = cur["id"]
    else:
        pid = db().table("pages").insert(row).execute().data[0]["id"]
    db().table("page_versions").insert({"page_id": pid, "markdown": md, "message": message, "author": author}).execute()


def add_questions(eng_id: str, page: str | None, lines: str | list, source: str):
    items = lines if isinstance(lines, list) else [
        {"importance": m.group(1), "question": m.group(2).split(" — ")[0].strip(), "why": (m.group(2).split(" — ") + [""])[1].strip(), "page": page}
        for m in re.finditer(r"^\s*-\s*\[(high|medium|low)\]\s*(.+)$", lines or "", re.M)]
    for q in items:
        db().table("questions").insert({"id": "q-" + secrets.token_hex(3), "engagement_id": eng_id, "page_path": q.get("page") or page,
                                        "importance": q["importance"], "question": q["question"], "why": q.get("why"), "source": source}).execute()


def draft_docs(p: dict):
    iv = _one("interviews", id=p["interview_id"])
    eng = _one("engagements", id=iv["engagement_id"])
    utts, frames = _utts(iv["id"]), _frames_for(iv)
    notes = [a["detail"]["note"] for a in db().table("activity").select("detail").eq("target", iv["id"]).eq("action", "interview_note").execute().data]
    existing = db().table("pages").select("path, meta").eq("engagement_id", eng["id"]).execute().data
    listing = "\n".join(f"- {x['path']}: {x['meta'].get('title')}" for x in existing) or "(none yet)"
    shared = prompt("handbook")

    reply = ask(shared + "\n\n" + prompt("outline"),
                f"<pages>\n{listing}\n</pages>\n<notes>\n" + "\n".join(notes) + f"\n</notes>\n<transcript>\n{media.transcript_lines(utts, frames)}\n</transcript>",
                max_tokens=6000)
    outline = tag_json(reply, "outline")
    batch = "\n".join(f"- {pg['path']}: {pg['title']} ({pg['type']})" for pg in outline["pages"])

    for pg in outline["pages"]:
        ranges = [(_to_sec(a), _to_sec(b)) for a, b in pg["ranges"]]
        inr = lambda t: any(a - 5 <= (t or 0) <= b + 5 for a, b in ranges)
        slice_ = media.transcript_lines([u for u in utts if inr(u["t_start"])], [f for f in frames if inr(f["t"])])
        chosen = [f for f in frames if f["name"] in pg.get("frames", [])] or [f for f in frames if inr(f["t"])]
        chosen = chosen[:: max(1, math.ceil(len(chosen) / 16))][:16]
        cur = _one("pages", engagement_id=eng["id"], path=pg["path"])
        content: list[dict] = [{"type": "text", "text":
            f"<target>{'new: ' + json.dumps({k: pg[k] for k in ('path', 'title', 'type', 'department')}) if not cur else cur['markdown']}</target>\n"
            f"<pages_existing>\n{listing}\n</pages_existing>\n<pages_this_batch>\n{batch}\n</pages_this_batch>\n"
            f"<notes>{chr(10).join(notes)}</notes>\n<transcript>\n{slice_}\n</transcript>"}]
        for f in chosen:
            content.append({"type": "text", "text": f"screenshot {f['name']} at {media.hms(f['t'])}"})
            content.append(image_block_from_storage(f"{eng['id']}/{iv['id']}/{f['name']}"))
        out = ask(shared + "\n\n" + prompt("draft", today=today()), content, max_tokens=12000)
        doc = tag(out, "document")
        if not doc:
            raise ValueError(f"draft for {pg['path']} returned no document")
        save_page(eng["id"], pg["path"], doc, tag(out, "summary") or f"Draft {pg['title']} from interview",
                  status="current" if eng["auto_publish"] else "draft")
        add_questions(eng["id"], pg["path"], tag(out, "questions") or "", "interview")
        if s := tag(out, "sanitized"):
            log(eng["id"], "sanitize", pg["path"], {"report": s})

    db().table("engagements").update({"status": "review"}).eq("id", eng["id"]).execute()
    # First audit runs right after the first docs; it makes videos according to the engagement's policy.
    a = db().table("audits").insert({"engagement_id": eng["id"], "kind": "audit", "scope": {"pages": None},
                                     "generate_video": eng["video_policy"] != "none"}).execute().data[0]
    enqueue("lss_audit", {"audit_id": a["id"]})


def image_block_from_storage(key: str) -> dict:
    import base64
    data = db().storage.from_("frames").download(key)
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(data).decode()}}


def apply_answers(p: dict):
    eng_id = p["engagement_id"]
    qs = db().table("questions").select("*").eq("engagement_id", eng_id).eq("status", "answered").execute().data
    by_page: dict[str, list] = {}
    for q in qs:
        if q["page_path"]:
            by_page.setdefault(q["page_path"], []).append(q)
    shared = prompt("handbook")
    for path, items in by_page.items():
        cur = _one("pages", engagement_id=eng_id, path=path)
        if not cur:
            continue
        answers = "\n".join(f"- {q['id']}: Q: {q['question']}\n  A ({q['answered_by']}): {q['answer']}" for q in items)
        out = ask(shared + "\n\n" + prompt("draft", today=today()), f"<target>{cur['markdown']}</target>\n<answers>\n{answers}\n</answers>", max_tokens=12000)
        doc = tag(out, "document")
        if doc:
            save_page(eng_id, path, doc, tag(out, "summary") or "Apply answers", author=p.get("by", "client"), status=cur["status"])
            ids = [q["id"] for q in items]
            db().table("questions").update({"status": "applied", "applied_at": iso(now())}).in_("id", ids).execute()


# ======================= Lean Six Sigma audit =======================

def _engagement_transcripts(eng_id: str, limit_chars=160_000) -> str:
    ivs = db().table("interviews").select("id, engagement_id").eq("engagement_id", eng_id).eq("status", "processed").execute().data
    parts = [f"<interview id='{iv['id']}'>\n{media.transcript_lines(_utts(iv['id']), _frames_for(iv))}\n</interview>" for iv in ivs]
    text = "\n".join(parts)
    return text[:limit_chars]


def lss_audit(p: dict):
    audit = _one("audits", id=p["audit_id"])
    eng = _one("engagements", id=audit["engagement_id"])
    db().table("audits").update({"status": "running"}).eq("id", audit["id"]).execute()
    pages = db().table("pages").select("path, markdown").eq("engagement_id", eng["id"]).execute().data
    scope = audit["scope"] or {}
    target = None
    if audit["kind"] == "optimization":
        target = _one("findings", id=scope["finding_id"])
        keep = {target["page_path"]} if target else set()
        pages = [pg for pg in pages if pg["path"] in keep or any(k and k.rsplit("/", 1)[0] in pg["path"] for k in keep)] or pages
    elif scope.get("pages"):
        pages = [pg for pg in pages if pg["path"] in scope["pages"]]
    answered = db().table("questions").select("question, answer, page_path").eq("engagement_id", eng["id"]).in_("status", ["answered", "applied"]).execute().data

    extra = ""
    if target:
        extra = ("7. OPTIMIZATION: the target finding is given in <target_finding>. Return it (improved and deepened) as findings[0], plus any closely related findings. "
                 "Add option_analysis (2–3 solution options; mark one recommended) and pilot_plan (a 2–4 week pilot with success criteria).")
    schema = json.dumps(models.AuditResult.model_json_schema(), separators=(",", ":"))
    system = prompt("lss_audit", org=eng["intake"].get("company", ""), kind=audit["kind"], optimization_extra=extra, schema=schema)
    content = ("<pages>\n" + "\n\n".join(f"<page path='{pg['path']}'>\n{pg['markdown']}\n</page>" for pg in pages) + "\n</pages>\n"
               f"<answered_questions>{json.dumps(answered)}</answered_questions>\n"
               + (f"<target_finding>{json.dumps(target, default=str)}</target_finding>\n" if target else "")
               + f"<transcripts>\n{_engagement_transcripts(eng['id'])}\n</transcripts>")
    result, _ = ask_validated(system, content, "audit", models.AuditResult, max_tokens=24000)
    store_audit(audit, eng, result)


def store_audit(audit: dict, eng: dict, result: models.AuditResult):
    ranked = models.rank(result.findings)
    ids = []
    for i, f in enumerate(ranked, 1):
        row = {"audit_id": audit["id"], "engagement_id": eng["id"], "rank": i, "title": f.title, "summary": f.summary,
               "page_path": f.page_path, "steps": f.steps, "waste": list(f.waste), "value": f.value,
               "root_causes": [c.model_dump() for c in f.root_causes], "five_whys": f.five_whys,
               "severity": f.fmea.severity, "occurrence": f.fmea.occurrence, "detection": f.fmea.detection,
               "impact": f.impact, "effort": f.effort, "quadrant": f.quadrant, "dmaic": f.dmaic.model_dump(),
               "recommendation": f.recommendation.model_dump(), "control_plan": [c.model_dump() for c in f.control_plan],
               "evidence": [e.model_dump(exclude_none=True) for e in f.evidence], "confidence": f.confidence, "major": f.major}
        ids.append((db().table("findings").insert(row).execute().data[0]["id"], f))
    payload = result.model_dump(exclude={"findings", "questions"})
    payload["metrics"] = models.metrics(result)
    db().table("audits").update({"status": "done", "result": payload}).eq("id", audit["id"]).execute()
    add_questions(eng["id"], None, [q.model_dump() for q in result.questions], "audit")
    db().table("engagements").update({"status": "audited"}).eq("id", eng["id"]).execute()
    enqueue("follow_up", {"engagement_id": eng["id"]}, iso(now() + dt.timedelta(hours=48)))

    if audit["generate_video"]:
        if audit["kind"] == "optimization":
            picks = ids[:1]
        else:
            policy = eng["video_policy"]
            picks = [x for x in ids if x[1].major][:3] if policy in ("major", "none") else ids[:6]
            picks = picks or ids[:1]
        for fid, f in picks:
            v = db().table("videos").insert({"engagement_id": eng["id"], "audit_id": audit["id"], "finding_ids": [fid], "title": f.title}).execute().data[0]
            enqueue("storyboard", {"video_id": v["id"]})
    _notify_client(eng, f"Your {'optimization' if audit['kind'] == 'optimization' else 'process audit'} is ready",
                   f"{len(ids)} findings, {sum(1 for _, f in ids if f.major)} major.")


def _notify_client(eng: dict, subject: str, line: str):
    to = eng["intake"].get("contact_email")
    if to:
        send_email(to, subject, f"<p>{line}</p><p><a href='{BASE}/portal/{eng['id']}'>Open your portal →</a></p>")


# ======================= video =======================

VIDEO_DIR = ROOT / "packages" / "video"


def _node(*args: str, check=True) -> subprocess.CompletedProcess:
    return subprocess.run(["node", "--experimental-strip-types", "--no-warnings", *args], cwd=VIDEO_DIR,
                          capture_output=True, text=True, check=check)


def storyboard(p: dict):
    v = _one("videos", id=p["video_id"])
    db().table("videos").update({"status": "storyboard"}).eq("id", v["id"]).execute()
    eng = _one("engagements", id=v["engagement_id"])
    fs = db().table("findings").select("*").in_("id", v["finding_ids"]).execute().data
    paths = {f["page_path"] for f in fs if f["page_path"]}
    pages = db().table("pages").select("path, markdown").eq("engagement_id", eng["id"]).execute().data
    pages = [pg for pg in pages if pg["path"] in paths or any(pp.rsplit("/", 1)[0] in pg["path"] for pp in paths)]
    audit = _one("audits", id=fs[0]["audit_id"]) if fs else None
    schema = (VIDEO_DIR.parent / "shared" / "src" / "storyboard.ts").read_text()
    system = prompt("storyboard", schema=schema)
    content = (f"<engagement>{eng['title']}</engagement>\n<findings>{json.dumps(fs, default=str)}</findings>\n"
               f"<sipoc_value_stream>{json.dumps((audit or {}).get('result', {}), default=str)[:30000]}</sipoc_value_stream>\n"
               "<pages>\n" + "\n\n".join(pg["markdown"] for pg in pages) + "\n</pages>")

    reply = ask(system, content, max_tokens=12000)
    work = Path(tempfile.mkdtemp(prefix="ps-sb-"))
    for attempt in range(2):
        sb = tag_json(reply, "storyboard")
        (work / "storyboard.json").write_text(json.dumps(sb))
        r = _node("validate.mjs", str(work / "storyboard.json"), check=False)
        if r.returncode == 0:
            break
        if attempt == 1:
            raise ValueError(f"storyboard invalid: {r.stdout[-2000:]}")
        reply = ask(system, f"{content}\n\nYour storyboard failed validation:\n{r.stdout[-4000:]}\nReturn the corrected full <storyboard>.", max_tokens=12000)
    db().table("videos").update({"storyboard": sb, "status": "tts"}).eq("id", v["id"]).execute()
    enqueue("render_video", {"video_id": v["id"]})


def srt_cues(scenes: list[dict], fps: int) -> list[tuple[float, float, str]]:
    """Same chunking as Explainer.tsx Captions: ≤ 42 chars, spread evenly over the scene."""
    cues, t0 = [], 0.0
    for s in scenes:
        dur = s["durationInFrames"] / fps
        chunks, cur = [], ""
        for w in s["narration"].split():
            if len((cur + " " + w).strip()) > 42:
                chunks.append(cur.strip()); cur = w
            else:
                cur += " " + w
        if cur.strip():
            chunks.append(cur.strip())
        per = dur / max(1, len(chunks))
        for i, c in enumerate(chunks):
            cues.append((t0 + i * per, t0 + (i + 1) * per, c))
        t0 += dur
    return cues


def _ts(sec: float, sep=","):
    ms = int(round(sec * 1000)); h, ms = divmod(ms, 3600_000); m, ms = divmod(ms, 60_000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def render_video(p: dict):
    v = _one("videos", id=p["video_id"])
    sb, fps = v["storyboard"], 30
    work = Path(tempfile.mkdtemp(prefix="ps-rv-"))
    audio = work / "audio"; audio.mkdir()
    scenes = []
    for i, s in enumerate(sb["scenes"]):
        name = f"scene{i:02d}.mp3"
        if tts(s["narration"], audio / name):
            secs = media.probe(audio / name)["duration"]
            scenes.append({**s, "audio": name, "durationInFrames": math.ceil((secs + 0.6) * fps)})
        else:
            words = len(s["narration"].split())
            scenes.append({**s, "durationInFrames": math.ceil((max(4, words / 140 * 60) + 0.6) * fps)})
    props = {"title": sb["title"], "engagement": sb["engagement"], "fps": fps, "scenes": scenes}
    (work / "props.json").write_text(json.dumps(props))

    db().table("videos").update({"status": "rendering"}).eq("id", v["id"]).execute()
    out = work / "guide.mp4"
    _node("render.mjs", str(work / "props.json"), str(out), "--audio-dir", str(audio))

    cues = srt_cues(scenes, fps)
    (work / "guide.srt").write_text("\n".join(f"{i}\n{_ts(a)} --> {_ts(b)}\n{t}\n" for i, (a, b, t) in enumerate(cues, 1)))
    (work / "guide.vtt").write_text("WEBVTT\n\n" + "\n".join(f"{_ts(a, '.')} --> {_ts(b, '.')}\n{t}\n" for a, b, t in cues))

    db().table("videos").update({"status": "checking"}).eq("id", v["id"]).execute()
    leaks = check_video(out)
    if leaks:
        log(v["engagement_id"], "video_pii_warning", v["id"], {"leaks": leaks[:20]})

    key = f"{v['engagement_id']}/{v['id']}"
    upload("videos", f"{key}/guide.mp4", out, "video/mp4")
    upload("videos", f"{key}/guide.srt", work / "guide.srt", "application/x-subrip")
    upload("videos", f"{key}/guide.vtt", work / "guide.vtt", "text/vtt")
    db().table("videos").update({"status": "ready", "mp4_path": f"{key}/guide.mp4", "srt_path": f"{key}/guide.srt",
                                 "duration_s": sum(s["durationInFrames"] for s in scenes) / fps}).eq("id", v["id"]).execute()
    eng = _one("engagements", id=v["engagement_id"])
    _notify_client(eng, f"Video guide ready: {v['title']}", "A new implementation video is in your portal.")


def check_video(path: Path) -> list[dict]:
    """OCR the finished video at 0.5 fps and flag anything classify() calls PII (the --check pass)."""
    import cv2
    from . import pii
    leaks = []
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    i = 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        if i % int(fps * 2) == 0:
            for x0, y0, x1, y1, t in pii.ocr_lines(img):
                k = pii.classify(t)
                if k and k != "date":
                    leaks.append({"t": round(i / fps, 1), "kind": k, "x": x0, "y": y0})
        i += 1
    cap.release()
    return leaks


# ======================= housekeeping =======================

def retention(p: dict):
    days = int(os.environ.get("RETENTION_DAYS", 30))
    cutoff = iso(now() - dt.timedelta(days=days))
    old = db().table("interviews").select("id, recording_path, engagement_id, medium").lt("end_at", cutoff).not_.is_("recording_path", "null").execute().data
    bucket = db().storage.from_("media")
    for iv in old:
        keys = [iv["recording_path"]]
        if iv.get("medium") == "room":   # every stitched stream (audio + screen shares) for this interview
            base = f"{iv['engagement_id']}/{iv['id']}/room"
            keys = [f"{base}/{f['name']}" for f in (bucket.list(base) or []) if f["name"].endswith(".webm")]
        if keys:
            bucket.remove(keys)
        db().table("interviews").update({"recording_path": None}).eq("id", iv["id"]).execute()
        log(iv["engagement_id"], "retention_delete", iv["id"])
    enqueue("retention", {}, iso(now() + dt.timedelta(days=1)))


def follow_up(p: dict):
    eng = _one("engagements", id=p["engagement_id"])
    open_hi = db().table("questions").select("id").eq("engagement_id", eng["id"]).eq("status", "open").eq("importance", "high").execute().data
    if open_hi:
        _notify_client(eng, f"{len(open_hi)} open questions on your process docs",
                       "Answer them in the portal, or reply to book a 15-minute follow-up interview.")


def notify_staff(p: dict):
    if to := os.environ.get("STAFF_EMAIL"):
        send_email(to, f"[shule] {p.get('subject', 'attention needed')}", f"<pre>{json.dumps(p, indent=2)}</pre>")


HANDLERS = {
    "outreach": outreach, "invite_client": invite_client, "interview_plan": interview_plan, "no_show": no_show,
    "post_interview": post_interview, "draft_docs": draft_docs, "apply_answers": apply_answers,
    "lss_audit": lss_audit, "storyboard": storyboard, "render_video": render_video,
    "retention": retention, "follow_up": follow_up, "notify_staff": notify_staff,
}
