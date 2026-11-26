// Minimal Stripe client (no SDK): Checkout Session for one video guide + webhook signature check.
import { createHmac, timingSafeEqual } from "node:crypto";

export async function createVideoCheckout(o: {
  videoId: string; engagementId: string; title: string; email?: string | null; cents: number; returnUrl: string;
}) {
  const f = new URLSearchParams({
    mode: "payment",
    success_url: `${o.returnUrl}?paid=${o.videoId}`,
    cancel_url: `${o.returnUrl}?canceled=${o.videoId}`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": process.env.VIDEO_PRICE_CURRENCY ?? "usd",
    "line_items[0][price_data][unit_amount]": String(o.cents),
    "line_items[0][price_data][product_data][name]": `Video guide: ${o.title}`.slice(0, 250),
    "line_items[0][price_data][product_data][description]": "Animated implementation guide: future state, build steps, roadmap and control plan.",
    "metadata[video_id]": o.videoId,
    "metadata[engagement_id]": o.engagementId,
    client_reference_id: o.videoId,
  });
  if (o.email) f.set("customer_email", o.email);
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: f,
  });
  if (!r.ok) throw new Error(`stripe ${r.status}: ${await r.text()}`);
  return (await r.json()) as { id: string; url: string };
}

/** Stripe-Signature: "t=<unix>,v1=<hex hmac of `${t}.${raw}`>" (several v1 allowed). */
export function verifyStripe(raw: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now() / 1000) {
  if (!header) return false;
  const parts = header.split(",").map(p => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  if (!t || Math.abs(now - Number(t)) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex"));
  return parts.filter(([k]) => k === "v1").some(([, v]) => {
    const b = Buffer.from(v ?? "");
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}
