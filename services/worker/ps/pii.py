"""On-screen PII detection + blur (same rules as the training-video pipeline's auto_blur.py).
If you have the tuned original, drop it in here; the interface is find_pii(lines) / blur(img, boxes)."""
from __future__ import annotations

import re
from statistics import median

import numpy as np

Line = tuple[int, int, int, int, str]  # x0, y0, x1, y1, text

EMAIL = re.compile(r"[\w.+'-]+\s?@\s?[\w-]+(\.[\w-]+)+")
LOOSE_EMAIL = re.compile(r"\w@\w")
GUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{6,12}", re.I)
SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
PHONE = re.compile(r"\+?\d[\d\s().-]{7,}\d")
DATE = re.compile(r"(?<![\d.])(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?![\d.])")
ID = re.compile(r"\b\d{6,}\b")
LAST_FIRST = re.compile(r"^[A-Z][\w'’.-]+(\s*\([^)]*\))?(\s[A-Z][\w'’.-]+)?\s*,\s*[A-Z][\w'’.-]")
NAME_WORD = re.compile(r"^([A-Z][a-z'’-]+\.?|[A-Z]\.|Mc[A-Z][a-z]+|O['’][A-Z][a-z]+|Jr\.?|Sr\.?|II|III)$")
SEP = re.compile(r"\s+[·•|–—-]\s+")

# Starter stop list; extend with the ~250-word tuned list from the training pipeline.
NOT_NAME_WORDS = {w.lower() for w in """
Application Applicant Program Status Slate Seminary Query Report Dashboard Settings Home Search Save Cancel
Submit Edit Delete New Open Close File View Help Tools Window Inbox Calendar Admissions Registrar Enrollment
Student Students Record Records Portal Reader Deliver Mailing Form Forms Event Events Decision Decisions
Round Term Fall Spring Summer Winter Campus Online Master Doctor Degree Divinity Theology Ministry Studies
Microsoft Google Chrome Edge Teams Zoom Windows Visual Studio Code Excel Word Outlook Jenzabar Caspio
Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August
September October November December Total Count Created Updated Owner Assigned Inquiry Prospect Admit
Deposit Enrolled Population Rule Source Format Upload Dataset Workflow Bin Queue Next Previous Back Page
""".split()}

HEADER_YES = re.compile(r"name|e-?mail|phone|mobile|cell|birt|dob|ssn|sisid|studentid|address|street|zip|postal|guardian|url|record")
HEADER_NO = re.compile(r"program|campus|site|pipeline|status|round|term|year|code|type|degree|created|location|decision")


def _classify_one(t: str) -> str | None:
    s = t.strip()
    if not s:
        return None
    if EMAIL.search(s) or LOOSE_EMAIL.search(s):
        return "email"
    if GUID.search(s) or "lookup/record" in s:
        return "record-id"
    if SSN.search(s):
        return "ssn"
    for m in PHONE.finditer(s):
        digits = re.sub(r"\D", "", m.group())
        if len(digits) >= 10 and not re.fullmatch(r"\d{4}-\d{4}", m.group()):
            return "phone"
    if DATE.search(s):
        return "date"
    if ID.search(s):
        return "id"
    if LAST_FIRST.search(s):
        return "name"
    words = s.split()
    if 2 <= len(words) <= 4 and len(s) <= 40 and all(NAME_WORD.match(w) for w in words) \
            and not any(w.lower().strip(".") in NOT_NAME_WORDS for w in words):
        return "name"
    return None


def classify(text: str) -> str | None:
    k = _classify_one(text)
    if k:
        return k
    if SEP.search(text):  # window titles / tabs: "First Last · Slate"
        for part in SEP.split(text):
            k = _classify_one(part)
            if k:
                return k
    return None


def _is_header(t: str) -> bool:
    s = re.sub(r"[^a-z]", "", t.lower())
    return len(t) <= 24 and bool(HEADER_YES.search(s)) and not HEADER_NO.search(s)


def find_pii(lines: list[Line], col_gap: int = 45) -> list[tuple[int, int, int, int, str]]:
    hits: list[tuple[int, int, int, int, str]] = []
    flagged: set[int] = set()
    for i, (x0, y0, x1, y1, t) in enumerate(lines):
        k = classify(t)
        if k:
            hits.append((x0, y0, x1, y1, k)); flagged.add(i)

    headers = [i for i, l in enumerate(lines) if _is_header(l[4])]
    for h in headers:
        hx0, hy0, hx1, hy1, _ = lines[h]
        below = sorted((i for i, l in enumerate(lines) if l[1] > hy1), key=lambda i: lines[i][1])
        last_y = hy1
        for i in below:
            x0, y0, x1, y1, _ = lines[i]
            if y0 - last_y > col_gap or i in headers:
                break
            overlap = max(0, min(x1, hx1) - max(x0, hx0)) / max(1, x1 - x0)
            if abs(x0 - hx0) <= 25 or overlap >= 0.5:
                if i not in flagged:
                    hits.append((x0, y0, x1, y1, "column")); flagged.add(i)
                last_y = y1
        # header band: first row may be cut off, so blank one row under it to the next header on the right
        right = [lines[j][0] for j in headers if lines[j][0] > hx1 and abs(lines[j][1] - hy0) < 20]
        band_h = max(30, int(2.5 * (hy1 - hy0)))
        hits.append((hx0, hy1, min(right) - 4 if right else hx1 + 200, hy1 + band_h, "column"))

    # partial rows: extend stacks of >= 3 left-aligned hits by one pitch up/down
    by_x: dict[int, list[tuple[int, int, int, int, str]]] = {}
    for h in hits:
        key = next((k for k in by_x if abs(k - h[0]) <= 12), h[0])
        by_x.setdefault(key, []).append(h)
    for stack in by_x.values():
        if len(stack) < 3:
            continue
        ys = sorted(s[1] for s in stack)
        pitch = median(b - a for a, b in zip(ys, ys[1:]))
        if not 0 < pitch <= 80:
            continue
        x0 = min(s[0] for s in stack); x1 = max(s[2] for s in stack)
        top, bot = min(s[1] for s in stack), max(s[3] for s in stack)
        above_caps = any(l[3] <= top and top - l[3] < pitch and l[4].isupper() for l in lines)
        if not above_caps:
            hits.append((x0, int(top - pitch), x1, top, "partial"))
        hits.append((x0, bot, x1, int(bot + pitch), "partial"))
    return hits


def blur(img: np.ndarray, boxes, pad: int = 4) -> np.ndarray:
    import cv2
    out = img.copy()
    H, W = out.shape[:2]
    for x0, y0, x1, y1, *_ in boxes:
        x0, y0 = max(0, int(x0) - pad), max(0, int(y0) - pad)
        x1, y1 = min(W, int(x1) + pad), min(H, int(y1) + pad)
        if x1 <= x0 or y1 <= y0:
            continue
        roi = out[y0:y1, x0:x1]
        small = cv2.resize(roi, (max(1, roi.shape[1] // 12), max(1, roi.shape[0] // 12)), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), 6)
        out[y0:y1, x0:x1] = cv2.resize(small, (roi.shape[1], roi.shape[0]), interpolation=cv2.INTER_NEAREST)
    return out


_ocr = None


def ocr_lines(img: np.ndarray) -> list[Line]:
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr = RapidOCR(params={"Global.use_cls": False, "Det.limit_side_len": 1280, "Det.limit_type": "max"})
    res, _ = _ocr(img)
    lines: list[Line] = []
    for poly, text, _conf in res or []:
        xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
        lines.append((int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys)), text))
    return lines
