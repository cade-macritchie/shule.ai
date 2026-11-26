import json
from pathlib import Path

from ps.agents import preview_scenes, srt_cues

SB = json.loads((Path(__file__).resolve().parents[3] / "packages/video/sample-storyboard.json").read_text())


def test_preview_shows_only_the_problem_then_locks():
    scenes = preview_scenes(SB, "$49")
    kinds = [s["kind"] for s in scenes]
    assert kinds == ["title", "current_state", "waste", "fishbone", "metric", "locked"]
    # nothing from the fix leaks as a scene of its own
    assert not {"future_state", "implementation", "architecture", "roadmap", "control", "outro"} & set(kinds)
    locked = scenes[-1]
    labels = [i["label"] for i in locked["data"]["items"]]
    assert len(labels) <= 6 and labels[-2:] == ["DMAIC roadmap", "Control plan"]
    assert locked["data"]["price"] == "$49"
    assert "5 build steps" in locked["narration"]


def test_preview_narration_does_not_contain_build_details():
    narr = " ".join(s["narration"] for s in preview_scenes(SB))
    assert "SFTP" not in narr and "source format" not in narr.lower()


def test_cues_work_for_locked_scene():
    sc = preview_scenes(SB)
    cues = srt_cues([{**s, "durationInFrames": 300} for s in sc], 30)
    assert cues and abs(cues[-1][1] - 10 * len(sc)) < 1e-6
