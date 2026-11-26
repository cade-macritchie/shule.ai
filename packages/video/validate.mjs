// node --experimental-strip-types validate.mjs storyboard.json → exit 0, or 4 with zod errors on stdout
import { readFileSync } from "node:fs";
import { Storyboard } from "../shared/src/storyboard.ts";

const r = Storyboard.safeParse(JSON.parse(readFileSync(process.argv[2], "utf8")));
if (r.success) { console.log("ok"); process.exit(0); }
for (const i of r.error.issues) console.log(`${i.path.join(".")}: ${i.message}`);
process.exit(4);
