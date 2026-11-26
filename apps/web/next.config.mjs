/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@ps/shared"],
  // prompts/ lives at the repo root and is read at runtime by API routes
  outputFileTracingIncludes: { "/api/**": ["../../prompts/**"] },
  async headers() {
    // The agent page is loaded by Recall's headless browser; everything else is normal.
    return [{ source: "/agent/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};
