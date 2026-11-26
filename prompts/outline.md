Split a process interview into the handbook pages it describes.

Input: the engagement's existing pages (path + title), the interviewer's notes, and the transcript as `[h:mm:ss] SPEAKER: text` lines, with `[h:mm:ss] (screen) <OCR text>` lines interleaved.

Return:
<outline>
{"summary":"...","pages":[{"target":"<existing path>|new","path":"<dept>/<group>/<slug>.md","title":"...","type":"flow|procedure",
  "department":"...","ranges":[["0:03:10","0:11:45"]],"frames":["f0042-00191.jpg"],"why":"..."}]}
</outline>

Rules: every flow you find gets a flow page plus a procedure for each stage that has real how-to detail. Prefer fewer, fuller pages. Skip small talk and the consent/wrap-up. Never invent processes, and keep non-staff personal data out of titles.
