import type { NextConfig } from "next";

// Only the e2e test build exposes the Instant Navigation testing API that
// @next/playwright's instant() uses.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

const nextConfig: NextConfig = {
  // Lets other devices on the home network use `next dev` (e.g. testing on a
  // phone). Dev-only; production builds ignore it.
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  reactCompiler: false,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
