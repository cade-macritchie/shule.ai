import subprocess
from pathlib import Path

import pytest

from ps import media, pii
from ps.agents import concat_chunks


def _make_webm(path: Path, seconds=12):
    # Three solid "screens" that change every 4 s, encoded like the browser's VP9 recorder.
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                    f"color=c=red:s=640x360:d=4,format=yuv420p[a];color=c=blue:s=640x360:d=4[b];color=c=white:s=640x360:d=4[c];[a][b][c]concat=n=3",
                    "-r", "5", "-c:v", "libvpx-vp9", "-deadline", "realtime", "-b:v", "300k", str(path)], check=True)


def test_concat_of_split_chunks_is_a_valid_recording(tmp_path):
    src = tmp_path / "src.webm"
    _make_webm(src)
    data = src.read_bytes()
    # MediaRecorder timeslice chunks are arbitrary byte slices of one stream
    parts = {f"{i + 1:06d}.webm": data[i * 7000:(i + 1) * 7000] for i in range(len(data) // 7000 + 1)}
    out = concat_chunks(list(parts)[::-1] + ["junk.txt"], lambda n: parts[n], tmp_path / "screen-abc123-1.webm")
    assert out and out.exists()
    assert abs(media.probe(out)["duration"] - 12) < 0.6


def test_screenshots_use_interview_clock(tmp_path, monkeypatch):
    monkeypatch.setattr(pii, "ocr_lines", lambda img: [])
    src = tmp_path / "s.webm"
    _make_webm(src)
    frames = media.screenshots(src, tmp_path / "frames", offset=300, start_index=5)
    assert [f["t"] for f in frames][:1] == [300]
    assert all(300 <= f["t"] <= 312 for f in frames) and len(frames) >= 2
    assert frames[0]["name"] == "f0006-00300.jpg"
    assert (tmp_path / "frames" / frames[0]["name"]).exists()
