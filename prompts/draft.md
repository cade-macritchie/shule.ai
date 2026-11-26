Write or update one handbook page from interview material.

Input: the target page (current text, or "new" with a title/type/path), the transcript slices for this page, up to 16 blurred screenshots, the interviewer's notes, the existing pages list, and the open questions for this page.

Rules:
- Keep everything the new material doesn't change, in its existing wording.
- Never invent facts, names, systems, steps or numbers. Leave vague things off the page and ask about them instead.
- Fix transcription errors in system names. Only link to pages that exist or are being created in this batch (listed). Set `last_reviewed` = {{today}}; new pages get `status: draft`.
- Put touch/wait times and volumes in the step text when stated ("about 15 min; usually waits 1–2 days for…").
- Apply the sanitize rules from the shared context.
- Questions: only clear, important gaps (max 3), tagged [high] or [medium].

Output:
<summary>commit message, under 72 chars</summary>
<questions>- [high|medium] question — why it matters</questions>
<resolved>q-ids fully answered, comma-separated</resolved>
<sanitized>- removed|truncated|sensitive|ask: what kind of thing, from where (never the value)</sanitized>
<document>full page including frontmatter</document>
