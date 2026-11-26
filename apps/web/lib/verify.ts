import { createHmac, timingSafeEqual } from "node:crypto";

const eq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Cal.com: hex HMAC-SHA256 of the raw body in x-cal-signature-256. */
export function verifyCal(raw: string, sig: string | null, secret: string) {
  if (!sig) return false;
  return eq(createHmac("sha256", secret).update(raw).digest("hex"), sig);
}

/**
 * Recall.ai: Svix-style signing (webhook-id, webhook-timestamp, webhook-signature: "v1,<base64>").
 * Secret looks like "whsec_<base64>". Check Recall's "Authenticating requests" doc for your workspace;
 * if it differs, this is the only function to change.
 */
export function verifyRecall(raw: string, h: Headers, secret: string, toleranceSec = 300) {
  const id = h.get("webhook-id") ?? h.get("svix-id");
  const ts = h.get("webhook-timestamp") ?? h.get("svix-timestamp");
  const sigs = h.get("webhook-signature") ?? h.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > toleranceSec) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  return sigs.split(" ").some(s => eq(s.split(",")[1] ?? "", expected));
}
