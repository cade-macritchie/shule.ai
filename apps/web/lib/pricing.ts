// Video guide price. Set NEXT_PUBLIC_VIDEO_PRICE_CENTS (e.g. 4900) in .env; the worker reads the same variable.
const cents = Number(process.env.NEXT_PUBLIC_VIDEO_PRICE_CENTS ?? "");
export const VIDEO_PRICE_CENTS = Number.isFinite(cents) && cents > 0 ? cents : null;
export const VIDEO_PRICE = VIDEO_PRICE_CENTS
  ? `$${(VIDEO_PRICE_CENTS / 100).toFixed(VIDEO_PRICE_CENTS % 100 ? 2 : 0)}`
  : "[$ price]";
