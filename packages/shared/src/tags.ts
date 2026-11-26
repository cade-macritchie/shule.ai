// Claude replies are tagged blocks (same convention as the handbook): <say>...</say> etc.
export function tag(text: string, name: string): string | null {
  const m = text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
}

export function tagJson<T = unknown>(text: string, name: string): T | null {
  const raw = tag(text, name);
  if (raw == null) return null;
  const body = raw.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(body) as T;
}
