"""Recording → screenshots at screen changes (16×9 grid rule) → OCR → PII blur."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np

from . import pii


def probe(src: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration",
                          "-of", "json", str(src)], capture_output=True, check=True, text=True).stdout
    j = json.loads(out)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    return {"duration": float(j["format"]["duration"]), "video": bool(v),
            "w": v and v["width"], "h": v and v["height"],
            "audio": any(s["codec_type"] == "audio" for s in j["streams"])}


def screenshots(src: Path, out_dir: Path, *, mask: tuple[int, int, int, int] | None = None,
                offset: float = 0, start_index: int = 0) -> list[dict]:
    """Sample at 1 fps; keep a frame when >= 10 grid cells changed vs the last kept one, the screen has
    settled (<= 4 cells vs previous sample) and >= 4 s passed; force one after 240 s of drift.
    `offset` shifts timestamps onto the interview clock (screen shares start part-way through)."""
    import cv2
    info = probe(src)
    if not info["video"]:
        return []
    W = min(1920, info["w"]); H = int(info["h"] * W / info["w"]) // 2 * 2
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-an", "-vf", f"fps=1,scale={W}:{H}",
                             "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    out_dir.mkdir(parents=True, exist_ok=True)
    frames, size = [], W * H * 3
    last_kept = prev = None
    last_t = -999
    t = 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if mask:
            x, y, w, h = mask; g = g.copy(); g[y:y + h, x:x + w] = 0
        grid = cv2.resize(g, (16, 9), interpolation=cv2.INTER_AREA).astype(np.int16)
        changed = 99 if last_kept is None else int((np.abs(grid - last_kept) > 10).sum())
        settled = prev is None or int((np.abs(grid - prev) > 10).sum()) <= 4
        due = (changed >= 10 and settled and t - last_t >= 4) or (changed > 0 and t - last_t >= 240)
        if due:
            lines = pii.ocr_lines(img)
            boxes = pii.find_pii(lines)
            clean = pii.blur(img, boxes)
            ts = int(t + offset)
            name = f"f{start_index + len(frames) + 1:04d}-{ts:05d}.jpg"
            cv2.imwrite(str(out_dir / name), clean, [cv2.IMWRITE_JPEG_QUALITY, 82])
            pii_lines = {i for i, l in enumerate(lines) if any(_overlaps(l, b) for b in boxes)}
            text = " ".join(l[4] for i, l in enumerate(lines) if i not in pii_lines)
            frames.append({"name": name, "t": ts, "text": text[:2000], "pii": len(boxes)})
            last_kept, last_t = grid, t
        prev = grid
        t += 1
    proc.wait()
    return frames


def _overlaps(l, b) -> bool:
    return not (l[2] < b[0] or b[2] < l[0] or l[3] < b[1] or b[3] < l[1])


def hms(sec: float) -> str:
    s = int(sec); return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


def transcript_lines(utts: list[dict], frames: list[dict]) -> str:
    """Interleave `[h:mm:ss] SPEAKER: text` and `[h:mm:ss] (screen) text` for the outline/draft prompts."""
    items = [(u["t_start"] or 0, f"[{hms(u['t_start'] or 0)}] {'INTERVIEWER' if u['is_bot'] else u['speaker']}: {u['text']}") for u in utts]
    items += [(f["t"], f"[{hms(f['t'])}] (screen {f['name']}) {f['text'][:300]}") for f in frames if f["text"]]
    return "\n".join(x for _, x in sorted(items, key=lambda i: i[0]))
