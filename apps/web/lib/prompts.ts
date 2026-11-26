import { readFileSync } from "node:fs";
import path from "node:path";

const dir = process.env.PROMPTS_DIR ?? path.join(process.cwd(), "..", "..", "prompts");
const cache = new Map<string, string>();

export function prompt(name: string, vars: Record<string, string | number> = {}) {
  let t = cache.get(name);
  if (!t) { t = readFileSync(path.join(dir, `${name}.md`), "utf8"); cache.set(name, t); }
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}
