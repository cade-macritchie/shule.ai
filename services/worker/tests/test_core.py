import json
from pathlib import Path

import numpy as np
import pytest

from ps import models, pii
from ps.agents import srt_cues, split_frontmatter, _to_sec
from ps.claude import tag, tag_json
from ps.media import transcript_lines

FIX = Path(__file__).parent / "fixtures"


def test_audit_fixture_validates_and_ranks():
    a = models.AuditResult.model_validate(tag_json((FIX / "sample_audit.txt").read_text(), "audit"))
    ranked = models.rank(a.findings)
    assert ranked[0].title.startswith("Batch handoff")
    assert ranked[0].rpn == 315 and ranked[0].major and ranked[0].quadrant == "major project"
    assert ranked[1].quadrant == "fill-in" and not ranked[1].major
    m = models.metrics(a)
    assert m["pce"] is None                         # one step is only estimated, one has null wait → < 70% stated
    assert m["sigma"] == {"dpmo": 15000, "sigma": 3.67}


def test_evidence_required():
    a = json.loads(json.dumps(tag_json((FIX / "sample_audit.txt").read_text(), "audit")))
    a["findings"][0]["evidence"] = [{"quote": "no timestamp"}]
    with pytest.raises(Exception):
        models.AuditResult.model_validate(a)


def test_sigma_reference_points():
    assert abs(models.sigma_level(66807, 1e6, 1)["sigma"] - 3.0) < 0.01
    assert models.sigma_level(3.4, 1e6, 1)["sigma"] == 6.0 or models.sigma_level(3.4, 1e6, 1)["sigma"] > 5.99


def test_pce_computed_when_stated():
    s = lambda v: models.VSStep(step="x", owner=None, system=None, touch_min=10, wait_min=30, value=v, source="stated")
    r = models.pce([s("VA"), s("NVA"), s("NVA"), s("BVA")])
    assert r == {"pce": 10 / 160, "lead_min": 160, "va_min": 10}


@pytest.mark.parametrize("text,kind", [
    ("jane.doe@example.edu", "email"), ("jane doe@example", "email"),
    ("123-45-6789", "ssn"), ("(619) 555-0134", "phone"), ("2026-11-03", "date"),
    ("ID 1048213", "id"), ("Doe, Jane", "name"), ("Jane Doe", "name"), ("Jane Doe · Slate", "name"),
    ("https://x.slate.org/manage/lookup/record?id=abc", "record-id"),
])
def test_classify_hits(text, kind):
    assert pii.classify(text) == kind


@pytest.mark.parametrize("text", ["Application Status", "Program Type", "30.00/30.00 FPS", "Version 4.2.1", "Save", "Fall Term"])
def test_classify_misses(text):
    assert pii.classify(text) is None


def test_column_rule_flags_values_under_name_header():
    lines = [(100, 100, 160, 120, "Name"), (300, 100, 380, 120, "Program"),
             (100, 130, 220, 150, "zq"), (100, 160, 220, 180, "xr"), (300, 130, 380, 150, "MDiv")]
    hits = pii.find_pii(lines)
    flagged = {(h[0], h[1]) for h in hits if h[4] == "column"}
    assert (100, 130) in flagged and (100, 160) in flagged and (300, 130) not in flagged


def test_blur_changes_only_box():
    img = (np.indices((60, 80)).sum(0) % 2 * 255).astype(np.uint8)[..., None].repeat(3, 2)
    out = pii.blur(img, [(10, 10, 30, 30)], pad=0)
    assert not np.array_equal(out[10:30, 10:30], img[10:30, 10:30])
    assert np.array_equal(out[40:, 40:], img[40:, 40:])


def test_tags_and_helpers():
    assert tag("x <say> hi </say>", "say") == "hi"
    assert tag_json("<j>```json\n{\"a\":1}\n```</j>", "j") == {"a": 1}
    meta, body = split_frontmatter("---\ntitle: A\ntype: flow\n---\n# A\n")
    assert meta == {"title": "A", "type": "flow"} and body.startswith("# A")
    assert _to_sec("1:02:03") == 3723 and _to_sec("2:05") == 125


def test_srt_cues_cover_scene_lengths():
    scenes = [{"narration": "one two three " * 10, "durationInFrames": 300}, {"narration": "short", "durationInFrames": 150}]
    cues = srt_cues(scenes, 30)
    assert all(len(c[2]) <= 42 for c in cues)
    assert abs(cues[-1][1] - 15.0) < 1e-6


def test_transcript_lines_format():
    utts = json.loads((FIX / "sample_transcript.json").read_text())
    out = transcript_lines(utts, [{"t": 30, "name": "f0001-00030.jpg", "text": "Deposit Paid"}])
    assert out.splitlines()[0].startswith("[0:00:02] INTERVIEWER:")
    assert "(screen f0001-00030.jpg) Deposit Paid" in out
