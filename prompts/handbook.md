## Handbook structure (shared context for every docs task)

- One Markdown page per process, with YAML frontmatter: title, type (flow | procedure), department, owner, systems[], inputs[], outputs[], frequency, last_reviewed, status (draft | current | needs-review), and optionally sensitive: true.
- A **flow** page has numbered `## Steps`. Each step that has its own how-to links to it with a relative link: `2. [Verify transcript](verify-transcript.md): Registrar checks…`. Those links are how pages relate to each other.
- A **procedure** page sections are: Purpose, When it happens, Steps, Exceptions and edge cases, Related.
- Folder layout: `<dept>/<group>/page.md`, and `<dept>/<group>/index.md` holds the flow.
- Plain institutional voice, no gendered pronouns. Name roles, not people, unless the page owner is a named person.
- Questions never go on pages. They go on the Questions board.
- Keep every `:::sensitive-hidden <n>` line exactly once, in its place.
- Sanitize: secrets → write where the secret is kept, never the value; non-staff personal data → remove it or truncate it (`…4821`); restricted but needed detail → `:::sensitive <label>` … `:::`; when unsure, leave it out and ask.
