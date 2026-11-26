"""External services: Supabase, Recall, Resend, TTS."""
from __future__ import annotations

import os
from pathlib import Path

import httpx

_db = None


def db():
    global _db
    if _db is None:
        from supabase import create_client
        _db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    return _db


def enqueue(kind: str, payload: dict, run_after: str | None = None):
    row = {"kind": kind, "payload": payload}
    if run_after:
        row["run_after"] = run_after
    db().table("jobs").insert(row).execute()


def log(engagement_id, action, target=None, detail=None, who="worker"):
    db().table("activity").insert({"engagement_id": engagement_id, "action": action, "target": target,
                                   "detail": detail, "who": who}).execute()


def upload(bucket: str, key: str, path: Path, content_type: str):
    db().storage.from_(bucket).upload(key, path.read_bytes(), {"content-type": content_type, "upsert": "true"})


# ---------- Recall ----------
def _recall(path: str) -> str:
    return f"https://{os.environ.get('RECALL_REGION', 'us-west-2')}.recall.ai/api/v1{path}"


def recall_bot(bot_id: str) -> dict:
    r = httpx.get(_recall(f"/bot/{bot_id}/"), headers={"Authorization": f"Token {os.environ['RECALL_API_KEY']}"}, timeout=30)
    r.raise_for_status()
    return r.json()


def recall_media_urls(bot: dict) -> dict:
    """Pull download URLs from the bot's first recording (media_shortcuts)."""
    rec = (bot.get("recordings") or [{}])[0]
    ms = rec.get("media_shortcuts") or {}
    get = lambda k: ((ms.get(k) or {}).get("data") or {}).get("download_url")
    return {"video": get("video_mixed"), "transcript": get("transcript")}


def download(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", url, timeout=None, follow_redirects=True) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_bytes(1 << 20):
                f.write(chunk)


# ---------- email ----------
def send_email(to: str, subject: str, html: str):
    if not os.environ.get("RESEND_API_KEY"):
        print(f"[email skipped] {to}: {subject}")
        return
    r = httpx.post("https://api.resend.com/emails", timeout=30,
                   headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
                   json={"from": os.environ["EMAIL_FROM"], "to": [to], "subject": subject, "html": html})
    r.raise_for_status()


# ---------- TTS ----------
def tts(text: str, dest: Path) -> bool:
    """Write speech to dest (mp3). Returns False when TTS is off (video renders with captions only)."""
    p = os.environ.get("TTS_PROVIDER", "elevenlabs")
    if p == "elevenlabs" and os.environ.get("ELEVENLABS_API_KEY"):
        r = httpx.post(f"https://api.elevenlabs.io/v1/text-to-speech/{os.environ['ELEVENLABS_VOICE_ID']}", timeout=120,
                       headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Accept": "audio/mpeg"},
                       json={"text": text, "model_id": "eleven_multilingual_v2"})
    elif p == "openai" and os.environ.get("OPENAI_API_KEY"):
        r = httpx.post("https://api.openai.com/v1/audio/speech", timeout=120,
                       headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                       json={"model": "gpt-4o-mini-tts", "voice": "alloy", "input": text, "response_format": "mp3"})
    else:
        return False
    r.raise_for_status()
    dest.write_bytes(r.content)
    return True
