// PAGES_BASE_PATH set (e.g. "/shule.ai") = static export of the marketing pages for GitHub Pages.
// See scripts/build-pages.sh: it removes the server-only routes before building.
const pagesBase = process.env.PAGES_BASE_PATH;

/** @type {import('next').NextConfig} */
const config = pagesBase !== undefined
  ? {
      transpilePackages: ["@ps/shared"],
      output: "export",
      basePath: pagesBase,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      transpilePackages: ["@ps/shared"],
      // prompts/ lives at the repo root and is read at runtime by API routes
      outputFileTracingIncludes: { "/api/**": ["../../prompts/**"] },
      async headers() {
        // The agent page is loaded by Recall's headless browser; everything else is normal.
        return [{ source: "/agent/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }];
      },
    };

export default config;
