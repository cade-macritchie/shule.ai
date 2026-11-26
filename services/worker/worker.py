"""shule worker: claims jobs from Supabase and runs ps.agents handlers.

  python worker.py                 # loop forever
  python worker.py --once          # one job then exit
  WORKER_KINDS=render_video,storyboard python worker.py   # specialise a box
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import socket
import sys
import time
import traceback

from ps.agents import HANDLERS
from ps.services import db, log

BACKOFF_MIN = [1, 4, 16]
MAX_ATTEMPTS = 3
NAME = f"{socket.gethostname()}-{os.getpid()}"


def claim():
    kinds = [k for k in os.environ.get("WORKER_KINDS", "").split(",") if k] or None
    rows = db().rpc("claim_job", {"worker": NAME, "kinds": kinds, "lease_seconds": 1800}).execute().data
    return rows[0] if rows else None


def run(job) -> None:
    fn = HANDLERS.get(job["kind"])
    try:
        if not fn:
            raise KeyError(f"no handler for {job['kind']}")
        print(f"[{NAME}] {job['kind']} #{job['id']}", flush=True)
        fn(job["payload"])
        db().table("jobs").update({"status": "done", "locked_by": None, "error": None}).eq("id", job["id"]).execute()
    except Exception as e:  # noqa: BLE001
        err = "".join(traceback.format_exception(e))[-4000:]
        print(err, file=sys.stderr, flush=True)
        if job["attempts"] >= MAX_ATTEMPTS:
            db().table("jobs").update({"status": "failed", "error": err}).eq("id", job["id"]).execute()
            _mark_failed(job, str(e))
        else:
            delay = BACKOFF_MIN[min(job["attempts"] - 1, len(BACKOFF_MIN) - 1)]
            run_after = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=delay)).isoformat()
            db().table("jobs").update({"status": "queued", "error": err, "run_after": run_after, "locked_by": None}).eq("id", job["id"]).execute()


def _mark_failed(job, msg: str):
    p = job["payload"]
    if "audit_id" in p:
        db().table("audits").update({"status": "failed"}).eq("id", p["audit_id"]).execute()
    if "video_id" in p:
        db().table("videos").update({"status": "failed"}).eq("id", p["video_id"]).execute()
    log(p.get("engagement_id"), "job_failed", job["kind"], {"job": job["id"], "error": msg[:500]})
    db().table("jobs").insert({"kind": "notify_staff", "payload": {"subject": f"job {job['kind']} failed", "job": job["id"], "error": msg[:500]}}).execute()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    a = ap.parse_args()
    while True:
        job = claim()
        if job:
            run(job)
        elif a.once:
            return
        else:
            time.sleep(3)
        if a.once and job:
            return


if __name__ == "__main__":
    main()
