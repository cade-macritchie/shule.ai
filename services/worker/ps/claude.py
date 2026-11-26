"""Claude calls + tagged-block parsing (same convention as the handbook's ai.py)."""
from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path
from typing import Any

import anthropic

ROOT = Path(__file__).resolve().parents[3]
PROMPTS = Path(os.environ.get("PROMPTS_DIR", ROOT / "prompts"))
DEEP = os.environ.get("CLAUDE_MODEL_DEEP", "claude-opus-5-5")

_client: anthropic.Anthropic | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def prompt(name: str, **vars: Any) -> str:
    text = (PROMPTS / f"{name}.md").read_text(encoding="utf-8")
    return re.sub(r"\{\{(\w+)\}\}", lambda m: str(vars.get(m.group(1), "")), text)


def tag(text: str, name: str) -> str | None:
    m = re.search(rf"<{name}>([\s\S]*?)</{name}>", text)
    return m.group(1).strip() if m else None


def tag_json(text: str, name: str) -> Any:
    raw = tag(text, name)
    if raw is None:
        raise ValueError(f"no <{name}> block in reply")
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    return json.loads(raw)


def image_block(path: Path) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                        "data": base64.b64encode(path.read_bytes()).decode()}}


def ask(system: str, content: list[dict] | str, *, model: str = DEEP, max_tokens: int = 16000) -> str:
    """One streamed call; returns the text. Streaming avoids HTTP timeouts on long Opus outputs."""
    if isinstance(content, str):
        content = [{"type": "text", "text": content}]
    with client().messages.stream(model=model, max_tokens=max_tokens, system=system,
                                  messages=[{"role": "user", "content": content}]) as s:
        msg = s.get_final_message()
    return "".join(b.text for b in msg.content if b.type == "text")


def ask_validated(system: str, content, tag_name: str, model_cls, *, retries: int = 1, **kw):
    """Ask, parse <tag> JSON, validate with pydantic; on failure, re-ask once with the error."""
    reply = ask(system, content, **kw)
    for attempt in range(retries + 1):
        try:
            return model_cls.model_validate(tag_json(reply, tag_name)), reply
        except Exception as e:  # noqa: BLE001
            if attempt == retries:
                raise
            fix = (f"Your previous reply failed validation:\n{e}\n\nReturn the corrected, complete "
                   f"<{tag_name}> block only.\n\nPrevious reply:\n{reply[-12000:]}")
            reply = ask(system, fix, **kw)
    raise RuntimeError("unreachable")
