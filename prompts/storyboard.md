Write a storyboard for a 3–6 minute animated explainer that shows an operations team how to fix the problem(s) below. It should be an overview, but with enough technical detail (systems, fields, triggers, automations, owners) that the team could start building after watching it.

Input: the finding(s) (with root causes, FMEA, recommendation, control plan, evidence), the affected pages, the SIPOC and value stream, and the engagement name.

Structure (adapt it, but keep the arc):
title → current_state → waste → fishbone → (metric, if real numbers exist) → future_state → implementation (1–2 scenes) → architecture (if systems integrate) → roadmap → control → outro

Rules:
- Narration: second person to the team, plain and confident, at 130–150 words per minute. Each scene runs 20–60 seconds of narration. Don't read the on-screen text verbatim; add to it.
- Every number on screen must come from the finding (stated or estimated). Label estimates in the narration ("we estimate…").
- `current_state` and `future_state` use the same lanes and step ids, so the animation can morph between them: mark `removed` and `automated` on the future state.
- Implementation details are specific: "In Slate, add a rule on the Application base: when Deposit Paid is set and the Jenzabar ID is empty, add the record to the 'Needs ID' queue." Use only systems named in the material.
- No personal data. Use roles, not names, except for page owners.

Return only:
<storyboard>JSON: {"title","engagement","scenes":[{"kind","narration","data"}]}</storyboard>

Scene data shapes:
{{schema}}
