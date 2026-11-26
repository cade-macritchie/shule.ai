"""Canonical Lean Six Sigma schemas + computed metrics (stored values come from here).
packages/shared/src/lss.ts mirrors these for the UI; both are tested against tests/fixtures."""
from __future__ import annotations

import math
from statistics import NormalDist
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

TIMWOODS = ("Transport", "Inventory", "Motion", "Waiting", "Overproduction", "Over-processing", "Defects", "Skills")
SIX_M = ("Method", "Machine", "Material", "Man", "Measurement", "Mother Nature")
DMAIC = ("Define", "Measure", "Analyze", "Improve", "Control")

Waste = Literal["Transport", "Inventory", "Motion", "Waiting", "Overproduction", "Over-processing", "Defects", "Skills"]
M = Literal["Method", "Machine", "Material", "Man", "Measurement", "Mother Nature"]
Phase = Literal["Define", "Measure", "Analyze", "Improve", "Control"]
Src = Literal["stated", "estimated", "unknown"]
Value = Literal["VA", "BVA", "NVA"]


class Evidence(BaseModel):
    t: Optional[str] = Field(None, pattern=r"^\d{1,2}:\d{2}:\d{2}$")
    quote: Optional[str] = Field(None, max_length=220)
    page: Optional[str] = None
    step: Optional[int] = None


class VSStep(BaseModel):
    step: str
    owner: Optional[str]
    system: Optional[str]
    touch_min: Optional[float] = Field(None, ge=0)
    wait_min: Optional[float] = Field(None, ge=0)
    value: Value
    source: Src
    basis: Optional[str] = None


class Cause(BaseModel):
    m: M
    cause: str
    root: bool = False


class FMEA(BaseModel):
    severity: int = Field(ge=1, le=10)
    occurrence: int = Field(ge=1, le=10)
    detection: int = Field(ge=1, le=10)


class ImplStep(BaseModel):
    step: str
    system: Optional[str]
    detail: str
    owner: Optional[str]


class Recommendation(BaseModel):
    future_state: str
    implementation: list[ImplStep] = Field(min_length=1)
    poka_yoke: Optional[str] = None


class ControlRow(BaseModel):
    metric: str
    target: str
    method: str
    owner: Optional[str]
    frequency: str
    reaction: str


class DmaicPlan(BaseModel):
    start_phase: Phase
    actions: dict[Phase, str] = {}


class Finding(BaseModel):
    title: str = Field(max_length=90)
    summary: str
    page_path: Optional[str]
    steps: list[int] = []
    waste: list[Waste] = Field(min_length=1)
    value: Value
    root_causes: list[Cause] = Field(min_length=1)
    five_whys: list[str] = Field(default=[], max_length=5)
    fmea: FMEA
    impact: int = Field(ge=1, le=5)
    effort: int = Field(ge=1, le=5)
    dmaic: DmaicPlan
    recommendation: Recommendation
    control_plan: list[ControlRow] = []
    evidence: list[Evidence] = Field(min_length=1)
    confidence: Literal["high", "medium", "low"]

    @field_validator("evidence")
    @classmethod
    def _evidence_has_ref(cls, v: list[Evidence]):
        for e in v:
            if not ((e.t and e.quote) or e.page):
                raise ValueError("each evidence item needs t+quote or page")
        return v

    # ---- computed ----
    @property
    def rpn(self) -> int:
        return self.fmea.severity * self.fmea.occurrence * self.fmea.detection

    @property
    def quadrant(self) -> str:
        return quadrant(self.impact, self.effort)

    @property
    def major(self) -> bool:
        return self.rpn >= 200 or (self.impact >= 4 and self.confidence != "low")


class SIPOC(BaseModel):
    suppliers: list[str]
    inputs: list[str]
    process: list[str] = Field(max_length=8)
    outputs: list[str]
    customers: list[str]


class CTQ(BaseModel):
    need: str
    driver: str
    ctq: str


class DefectData(BaseModel):
    defects: float
    units: float
    opportunities: float
    source: Src


class Question(BaseModel):
    importance: Literal["high", "medium", "low"]
    question: str
    why: str
    page: Optional[str] = None


class Option(BaseModel):
    option: str
    cost: str
    time: str
    risk: str
    systems: list[str]
    recommended: bool


class AuditResult(BaseModel):
    summary: str
    sipoc: SIPOC
    value_stream: list[VSStep]
    ctq_tree: list[CTQ] = []
    defect_data: Optional[DefectData] = None
    findings: list[Finding] = Field(max_length=12)
    questions: list[Question] = []
    option_analysis: Optional[list[Option]] = None
    pilot_plan: Optional[str] = None


# ---------- computed metrics ----------

def quadrant(impact: int, effort: int) -> str:
    hi, easy = impact >= 3, effort <= 2
    return ("quick win" if easy else "major project") if hi else ("fill-in" if easy else "thankless")


def pce(vs: list[VSStep]) -> Optional[dict]:
    """Process cycle efficiency, only when >= 70% of steps have stated touch+wait times."""
    if not vs:
        return None
    stated = [s for s in vs if s.source == "stated" and s.touch_min is not None and s.wait_min is not None]
    if len(stated) / len(vs) < 0.7:
        return None
    known = [s for s in vs if s.touch_min is not None and s.wait_min is not None]
    lead = sum(s.touch_min + s.wait_min for s in known)
    va = sum(s.touch_min for s in known if s.value == "VA")
    return {"pce": va / lead, "lead_min": lead, "va_min": va} if lead > 0 else None


def sigma_level(defects: float, units: float, opportunities: float) -> Optional[dict]:
    if units <= 0 or opportunities <= 0:
        return None
    dpmo = defects / (units * opportunities) * 1e6
    y = 1 - dpmo / 1e6
    if y >= 1:
        sigma = 6.0
    elif y <= 0:
        sigma = 0.0
    else:
        sigma = min(6.0, NormalDist().inv_cdf(y) + 1.5)
    return {"dpmo": round(dpmo), "sigma": round(sigma, 2)}


def rank(findings: list[Finding]) -> list[Finding]:
    return sorted(findings, key=lambda f: (not f.major, -f.rpn, -(f.impact / f.effort)))


def metrics(a: AuditResult) -> dict:
    out: dict = {"pce": pce(a.value_stream), "sigma": None}
    d = a.defect_data
    if d and d.source == "stated":
        out["sigma"] = sigma_level(d.defects, d.units, d.opportunities)
    out["va_ratio"] = (sum(1 for s in a.value_stream if s.value == "VA") / len(a.value_stream)) if a.value_stream else None
    return out
